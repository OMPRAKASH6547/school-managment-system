import { NextRequest, NextResponse } from "next/server";
import { getSession, requireOrganization } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { requirePermission } from "@/lib/permissions";
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

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    requirePermission(session, "staff", "write");
    requireOrganization(session);
    const { id } = await params;
    const staff = await prisma.staff.findFirst({
      where: { id, organizationId: session.organizationId! },
    });
    if (!staff) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const raw = await req.json();
    const data = bodySchema.parse({
      ...raw,
      joinDate: raw.joinDate || null,
      salary: raw.salary != null ? Number(raw.salary) : null,
    });

    const targetBranch = await prisma.branch.findFirst({
      where: { id: data.branchId, organizationId: session.organizationId! },
      select: { id: true },
    });
    if (!targetBranch) {
      return NextResponse.json({ error: "Invalid branch" }, { status: 400 });
    }

    await prisma.staff.update({
      where: { id },
      data: {
        branchId: targetBranch.id,
        employeeId: data.employeeId ?? null,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone ?? null,
        role: data.role,
        designation: data.designation ?? null,
        joinDate: data.joinDate ? new Date(data.joinDate) : null,
        salary: data.salary ?? null,
        status: data.status ?? staff.status,
      },
    });

    // Keep teacher class assignments in sync from edit form.
    if (data.role === "teacher") {
      const uniqueClassIds = Array.from(new Set(data.classIds ?? []));
      const validClasses = await prisma.class.findMany({
        where: {
          organizationId: session.organizationId!,
          branchId: targetBranch.id,
          status: "active",
          id: { in: uniqueClassIds },
        },
        select: { id: true },
      });
      const validClassIds = validClasses.map((c) => c.id);

      const existingAssignments = await prisma.teacherAssignment.findMany({
        where: { organizationId: session.organizationId!, branchId: targetBranch.id, teacherStaffId: id },
        select: { id: true, classId: true },
      });

      const existingIds = new Set(existingAssignments.map((a) => a.classId));
      const targetIds = new Set(validClassIds);

      for (const clsId of validClassIds) {
        if (!existingIds.has(clsId)) {
          const subjectText = data.classSubjects?.[clsId]?.trim() || null;
          try {
            await prisma.teacherAssignment.create({
              data: ({
                organizationId: session.organizationId!,
                branchId: targetBranch.id,
                teacherStaffId: id,
                classId: clsId,
                ...(subjectText ? ({ subjects: subjectText } as any) : {}),
              } as any),
            });
          } catch {
            await prisma.teacherAssignment.create({
              data: {
                organizationId: session.organizationId!,
                branchId: targetBranch.id,
                teacherStaffId: id,
                classId: clsId,
              },
            });
          }
        } else {
          const current = existingAssignments.find((a) => a.classId === clsId);
          const subjectText = data.classSubjects?.[clsId]?.trim() || null;
          if (current) {
            try {
              await prisma.teacherAssignment.update({
                where: { id: current.id },
                data: ({ subjects: subjectText } as any),
              });
            } catch {
              // ignore if field does not exist in current Prisma client
            }
          }
        }
      }

      for (const a of existingAssignments) {
        if (!targetIds.has(a.classId)) {
          await prisma.teacherAssignment.delete({ where: { id: a.id } });
        }
      }
    } else {
      await prisma.teacherAssignment.deleteMany({
        where: { organizationId: session.organizationId!, teacherStaffId: id },
      });
    }

    // Keep login role in sync with staff role.
    const org = await prisma.organization.findUnique({
      where: { id: session.organizationId! },
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
    await prisma.user.updateMany({
      where: { email: data.email, organizationId: session.organizationId!, isActive: true },
      data: {
        role: userRole,
        name: `${data.firstName} ${data.lastName}`,
        phone: data.phone ?? null,
        permissionsJson,
      },
    });

    return NextResponse.json({ ok: true });
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

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    requirePermission(session, "staff", "write");
    requireOrganization(session);
    const { id } = await params;
    const staff = await prisma.staff.findFirst({
      where: { id, organizationId: session.organizationId! },
      select: { id: true, email: true },
    });
    if (!staff) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.$transaction(async (tx) => {
      // Remove dependent records that require an existing staff row.
      await tx.staffAttendance.deleteMany({
        where: { organizationId: session.organizationId!, staffId: id },
      });
      await tx.teacherAssignment.deleteMany({
        where: { organizationId: session.organizationId!, teacherStaffId: id },
      });
      await tx.teacherClassSession.deleteMany({
        where: { organizationId: session.organizationId!, teacherStaffId: id },
      });

      // Payments can remain, but should no longer point to deleted staff.
      await tx.payment.updateMany({
        where: { organizationId: session.organizationId!, staffId: id },
        data: { staffId: null },
      });
      await tx.payment.updateMany({
        where: { organizationId: session.organizationId!, collectedByStaffId: id },
        data: { collectedByStaffId: null },
      });

      await tx.staff.delete({ where: { id } });
      await tx.user.updateMany({
        where: { organizationId: session.organizationId!, email: staff.email },
        data: { isActive: false },
      });
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Error && e.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
