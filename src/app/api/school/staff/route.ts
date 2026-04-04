import { NextRequest, NextResponse } from "next/server";
import { getSession, requireOrganization, hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { randomBytes } from "crypto";
import { requirePermission } from "@/lib/permissions";
import { notifyEmailAndWhatsApp } from "@/lib/notifications";
import {
  firstZodIssueMessage,
  LIMITS,
  zCuidId,
  zEmail,
  zOptionalStr,
  zPersonName,
  zPhoneOpt,
} from "@/lib/field-validation";

const bodySchema = z.object({
  branchId: zCuidId,
  employeeId: zOptionalStr(LIMITS.employeeId),
  firstName: zPersonName,
  lastName: zPersonName,
  email: zEmail,
  phone: zPhoneOpt,
  role: z.preprocess(
    (v) => (v === undefined || v === null ? "" : typeof v === "string" ? v.trim() : v),
    z.string().min(1).max(LIMITS.roleKey),
  ),
  designation: zOptionalStr(LIMITS.designation),
  joinDate: z.string().max(32).nullable().optional(),
  salary: z.number().nullable().optional(),
  status: zOptionalStr(LIMITS.statusKey),
  classIds: z.array(zCuidId).max(200).optional(),
  classSubjects: z.record(z.string().max(LIMITS.idString), z.string().max(LIMITS.mediumLine)).optional(),
  moduleAccess: z.record(
    z.object({
      view: z.boolean().optional(),
      add: z.boolean().optional(),
      edit: z.boolean().optional(),
      delete: z.boolean().optional(),
    }),
  ).optional(),
});

const NON_COACHING_MODULES = ["library", "transport", "hostel"] as const;

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    requirePermission(session, "staff", "write");
    requireOrganization(session);
    const orgId = session.organizationId!;

    const raw = await req.json();
    const data = bodySchema.parse({
      ...raw,
      joinDate: raw.joinDate || null,
      salary: raw.salary != null ? Number(raw.salary) : null,
    });

    const existingUser = await prisma.user.findUnique({ where: { email: data.email } });
    if (existingUser) {
      return NextResponse.json({ error: "Email already used for another login" }, { status: 400 });
    }

    const targetBranch = await prisma.branch.findFirst({
      where: { id: data.branchId, organizationId: orgId },
      select: { id: true },
    });
    if (!targetBranch) {
      return NextResponse.json({ error: "Invalid branch" }, { status: 400 });
    }

    const generateEmployeeId = async (): Promise<string> => {
      for (let attempt = 0; attempt < 10; attempt++) {
        const code = `EMP-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
        const exists = await prisma.staff.findFirst({
          where: { organizationId: orgId, employeeId: code },
          select: { id: true },
        });
        if (!exists) return code;
      }
      return `EMP-${Date.now()}`;
    };
    const employeeId = data.employeeId ? data.employeeId : await generateEmployeeId();

    // Generate temporary password for staff login.
    const plainPassword = randomBytes(8).toString("base64url");
    const passwordHash = await hashPassword(plainPassword);

    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { type: true },
    });
    const isCoaching = (org?.type ?? "").toLowerCase() === "coaching";
    const sanitizedModuleAccess = data.moduleAccess ? { ...data.moduleAccess } : undefined;
    if (isCoaching && sanitizedModuleAccess) {
      for (const moduleKey of NON_COACHING_MODULES) {
        sanitizedModuleAccess[moduleKey] = { view: false, add: false, edit: false, delete: false };
      }
    }

    const userRole = data.role;
    const permissionsJson = sanitizedModuleAccess ? JSON.stringify(sanitizedModuleAccess) : null;

    await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        name: `${data.firstName} ${data.lastName}`,
        role: userRole,
        organizationId: orgId,
        phone: data.phone ?? null,
        permissionsJson,
        isActive: true,
        emailVerified: false,
      },
    });

    let createdStaff;
    try {
      createdStaff = await prisma.staff.create({
        data: {
          organizationId: orgId,
          branchId: targetBranch.id,
          employeeId,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone || null,
          role: data.role,
          designation: data.designation || null,
          generatedLoginPassword: plainPassword,
          joinDate: data.joinDate ? new Date(data.joinDate) : null,
          salary: data.salary ?? null,
          status: data.status || "active",
        } as any,
      });
    } catch {
      // Backward compatibility when Prisma client/schema is not yet updated.
      createdStaff = await prisma.staff.create({
        data: {
          organizationId: orgId,
          branchId: targetBranch.id,
          employeeId,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone || null,
          role: data.role,
          designation: data.designation || null,
          joinDate: data.joinDate ? new Date(data.joinDate) : null,
          salary: data.salary ?? null,
          status: data.status || "active",
        },
      });
    }

    if (data.role === "teacher" && (data.classIds?.length ?? 0) > 0) {
      const uniqueClassIds = Array.from(new Set(data.classIds ?? []));
      const validClasses = await prisma.class.findMany({
        where: {
          organizationId: orgId,
          branchId: targetBranch.id,
          status: "active",
          id: { in: uniqueClassIds },
        },
        select: { id: true },
      });
      for (const cls of validClasses) {
        const subjectText = data.classSubjects?.[cls.id]?.trim() || null;
        try {
          await prisma.teacherAssignment.create({
            data: {
              organizationId: orgId,
              branchId: targetBranch.id,
              teacherStaffId: createdStaff.id,
              classId: cls.id,
              ...(subjectText ? ({ subjects: subjectText } as any) : {}),
            } as any,
          });
        } catch {
          // Backward compatibility when Prisma client/schema is not updated with subjects.
          await prisma.teacherAssignment.create({
            data: {
              organizationId: orgId,
              branchId: targetBranch.id,
              teacherStaffId: createdStaff.id,
              classId: cls.id,
            },
          });
        }
      }
    }

    const orgRecord = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { name: true, email: true, phone: true },
    });
    void notifyEmailAndWhatsApp({
      emails: [data.email, orgRecord?.email].filter(Boolean) as string[],
      phones: [...(data.phone ? [data.phone] : []), ...(orgRecord?.phone ? [orgRecord.phone] : [])],
      subject: `Staff account created — ${orgRecord?.name ?? "School"}`,
      html: `
        <p>You have been added to <strong>${orgRecord?.name ?? "the school portal"}</strong>.</p>
        <p><strong>Login email:</strong> ${data.email}</p>
        <p><strong>Temporary password:</strong> ${plainPassword}</p>
        <p><strong>Employee ID:</strong> ${employeeId}</p>
        <p><strong>Role:</strong> ${data.role}</p>
        <p>Sign in with the email above and this password. Store it securely.</p>
      `,
    });

    return NextResponse.json({ ok: true, password: plainPassword, employeeId });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: firstZodIssueMessage(e) }, { status: 400 });
    }
    if (e instanceof Error && e.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
