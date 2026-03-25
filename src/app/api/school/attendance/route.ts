import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSelectedBranchId, requireBranchAccess, requireOrganization } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const bodySchema = z.object({
  date: z.string(),
  entries: z.array(z.object({
    studentId: z.string(),
    status: z.enum(["present", "absent", "late", "leave"]),
  })),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    requireOrganization(session);
    if (session.role !== "super_admin" && session.role !== "school_admin" && session.role !== "teacher") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    const orgId = session.organizationId!;
    const branchId = await requireBranchAccess(orgId, await getSelectedBranchId());

    const data = bodySchema.parse(await req.json());
    const date = new Date(data.date);
    date.setHours(0, 0, 0, 0);

    // Teacher can only mark attendance for assigned classes.
    let teacherStaffId: string | null = null;
    if (session.role === "teacher") {
      const teacherStaff = await prisma.staff.findFirst({
        where: { email: session.email, organizationId: orgId, branchId, role: "teacher" },
        select: { id: true },
      });
      if (!teacherStaff) return NextResponse.json({ error: "Teacher not found" }, { status: 403 });
      teacherStaffId = teacherStaff.id;
    }

    for (const entry of data.entries) {
      const student = await prisma.student.findFirst({
        where: { id: entry.studentId, organizationId: orgId, branchId },
        select: { id: true, branchId: true, classId: true },
      });
      if (!student) continue;

      if (session.role === "teacher") {
        if (!student.classId) return NextResponse.json({ error: "Student has no class" }, { status: 400 });
        const assignment = await prisma.teacherAssignment.findFirst({
          where: {
            teacherStaffId: teacherStaffId!,
            classId: student.classId,
            organizationId: orgId,
            branchId,
          },
          select: { id: true },
        });
        if (!assignment) return NextResponse.json({ error: "Not assigned to this class" }, { status: 403 });
      }

      await prisma.attendance.upsert({
        where: {
          studentId_date: { studentId: entry.studentId, date },
        },
        create: {
          studentId: entry.studentId,
          organizationId: orgId,
          branchId: student.branchId ?? branchId,
          date,
          status: entry.status,
        },
        update: { status: entry.status },
      });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.errors[0]?.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
