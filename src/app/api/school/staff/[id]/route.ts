import { NextRequest, NextResponse } from "next/server";
import { getSession, getSelectedBranchId, requireBranchAccess, requireOrganization } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
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

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    requirePermission(session, "staff", "write");
    requireOrganization(session);
    const branchId = await requireBranchAccess(session.organizationId!, await getSelectedBranchId());
    const { id } = await params;
    const staff = await prisma.staff.findFirst({
      where: { id, organizationId: session.organizationId!, branchId },
    });
    if (!staff) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const raw = await req.json();
    const data = bodySchema.parse({
      ...raw,
      joinDate: raw.joinDate || null,
      salary: raw.salary != null ? Number(raw.salary) : null,
    });

    await prisma.staff.update({
      where: { id },
      data: {
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

    // Keep login role in sync with staff role.
    const userRole = data.role;
    await prisma.user.updateMany({
      where: { email: data.email, organizationId: session.organizationId!, isActive: true },
      data: {
        role: userRole,
        name: `${data.firstName} ${data.lastName}`,
        phone: data.phone ?? null,
      },
    });

    return NextResponse.json({ ok: true });
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
