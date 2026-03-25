import { NextRequest, NextResponse } from "next/server";
import { getSession, getSelectedBranchId, requireBranchAccess, requireOrganization } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { requirePermission } from "@/lib/permissions";

const bodySchema = z.object({
  teacherStaffId: z.string().min(1),
  classId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    requirePermission(session, "teacher-assignments", "write");
    requireOrganization(session);

    const orgId = session.organizationId!;
    const branchId = await requireBranchAccess(orgId, await getSelectedBranchId());

    const body = bodySchema.parse(await req.json());

    const teacher = await prisma.staff.findFirst({
      where: { id: body.teacherStaffId, organizationId: orgId, branchId, role: "teacher" },
      select: { id: true },
    });
    if (!teacher) {
      return NextResponse.json({ error: "Teacher not found in this branch" }, { status: 404 });
    }

    const cls = await prisma.class.findFirst({
      where: { id: body.classId, organizationId: orgId, branchId, status: "active" },
      select: { id: true },
    });
    if (!cls) {
      return NextResponse.json({ error: "Class not found in this branch" }, { status: 404 });
    }

    await prisma.teacherAssignment.create({
      data: {
        organizationId: orgId,
        branchId,
        teacherStaffId: teacher.id,
        classId: cls.id,
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
    return NextResponse.json({ error: "Failed to assign class" }, { status: 500 });
  }
}

