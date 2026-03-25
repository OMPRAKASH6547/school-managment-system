import { NextRequest, NextResponse } from "next/server";
import { getSession, getSelectedBranchId, requireBranchAccess, requireOrganization } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { requirePermission } from "@/lib/permissions";

const bodySchema = z.object({
  rollNo: z.string().optional(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().optional(),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  address: z.string().optional(),
  guardianName: z.string().optional(),
  guardianPhone: z.string().optional(),
  classId: z.string().nullable().optional(),
  status: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    requirePermission(session, "students", "write");
    requireOrganization(session);
    const branchId = await requireBranchAccess(session.organizationId!, await getSelectedBranchId());
    const { id } = await params;
    const student = await prisma.student.findFirst({
      where: { id, organizationId: session.organizationId!, branchId },
    });
    if (!student) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const data = bodySchema.parse(await req.json());
    await prisma.student.update({
      where: { id },
      data: {
        rollNo: data.rollNo ?? null,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email ?? null,
        phone: data.phone ?? null,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        gender: data.gender ?? null,
        address: data.address ?? null,
        guardianName: data.guardianName ?? null,
        guardianPhone: data.guardianPhone ?? null,
        classId: data.classId ?? null,
        status: data.status ?? student.status,
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
