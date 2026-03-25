import { NextRequest, NextResponse } from "next/server";
import { getSession, getSelectedBranchId, requireBranchAccess, requireOrganization, hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { randomBytes } from "crypto";
import { requirePermission } from "@/lib/permissions";

const bodySchema = z.object({
  employeeId: z.string().optional(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  role: z.string().min(1),
  designation: z.string().optional(),
  joinDate: z.string().nullable().optional(),
  salary: z.number().nullable().optional(),
  status: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    requirePermission(session, "staff", "write");
    requireOrganization(session);
    const orgId = session.organizationId!;
    const branchId = await requireBranchAccess(orgId, await getSelectedBranchId());

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

    // Generate temporary password for staff login.
    const plainPassword = randomBytes(8).toString("base64url");
    const passwordHash = await hashPassword(plainPassword);

    const userRole = data.role;

    await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        name: `${data.firstName} ${data.lastName}`,
        role: userRole,
        organizationId: orgId,
        phone: data.phone ?? null,
        isActive: true,
        emailVerified: false,
      },
    });

    await prisma.staff.create({
      data: {
        organizationId: orgId,
        branchId,
        employeeId: data.employeeId || null,
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

    return NextResponse.json({ ok: true, password: plainPassword });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.errors[0]?.message }, { status: 400 });
    }
    if (e instanceof Error && e.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
