import { NextRequest, NextResponse } from "next/server";
import { getSession, getSelectedBranchId, requireBranchAccess, requireOrganization } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const bodySchema = z.object({
  classId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    requireOrganization(session);
    if (session.role !== "teacher") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const orgId = session.organizationId!;
    const branchId = await requireBranchAccess(orgId, await getSelectedBranchId());
    const body = bodySchema.parse(await req.json());

    const teacherStaff = await prisma.staff.findFirst({
      where: { email: session.email, organizationId: orgId, branchId, role: "teacher" },
      select: { id: true },
    });
    if (!teacherStaff) return NextResponse.json({ error: "Teacher not found" }, { status: 404 });

    const assignment = await prisma.teacherAssignment.findFirst({
      where: {
        teacherStaffId: teacherStaff.id,
        classId: body.classId,
        organizationId: orgId,
        branchId,
      },
      select: { id: true },
    });
    if (!assignment) return NextResponse.json({ error: "Not assigned to this class" }, { status: 403 });

    const active = await prisma.teacherClassSession.findFirst({
      where: { teacherStaffId: teacherStaff.id, classId: body.classId, branchId, endedAt: null },
      select: { id: true },
    });
    if (active) return NextResponse.json({ error: "Session already started" }, { status: 400 });

    await prisma.teacherClassSession.create({
      data: {
        organizationId: orgId,
        branchId,
        teacherStaffId: teacherStaff.id,
        classId: body.classId,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: e.errors[0]?.message }, { status: 400 });
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

