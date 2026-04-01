import { NextRequest, NextResponse } from "next/server";
import { getSession, getSelectedBranchId, resolveBranchIdForOrganization, requireOrganization } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const bodySchema = z.object({
  classId: z.string().min(1),
  autoMarkAttendance: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    requireOrganization(session);
    if (session.role !== "teacher" && session.role !== "staff") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const orgId = session.organizationId!;
    const branchId = await resolveBranchIdForOrganization(orgId, await getSelectedBranchId());
    const body = bodySchema.parse(await req.json());

    const teacherStaff = await prisma.staff.findFirst({
      where: { email: session.email, organizationId: orgId, branchId, status: "active" },
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
      where: { teacherStaffId: teacherStaff.id, branchId, endedAt: null },
      select: { id: true, classId: true },
    });
    if (active && active.classId === body.classId) {
      return NextResponse.json({ error: "Session already started for this class" }, { status: 400 });
    }
    if (active) {
      return NextResponse.json(
        { error: "Another class is already active. End it first." },
        { status: 400 }
      );
    }

    await prisma.teacherClassSession.create({
      data: {
        organizationId: orgId,
        branchId,
        teacherStaffId: teacherStaff.id,
        classId: body.classId,
      },
    });

    if (body.autoMarkAttendance) {
      const attendanceDate = new Date();
      attendanceDate.setHours(0, 0, 0, 0);
      const students = await prisma.student.findMany({
        where: { organizationId: orgId, branchId, classId: body.classId, status: "active" },
        select: { id: true },
      });
      for (const student of students) {
        await prisma.attendance.upsert({
          where: {
            studentId_date: { studentId: student.id, date: attendanceDate },
          },
          create: {
            organizationId: orgId,
            branchId,
            studentId: student.id,
            date: attendanceDate,
            status: "present",
          },
          update: {},
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.errors[0]?.message }, { status: 400 });
    }
    if (e instanceof Error) {
      const msg = e.message ?? "Failed";
      const status = msg.includes("No organization") || msg.includes("No organization assigned") ? 401 : msg.includes("Unauthorized") ? 403 : 500;
      return NextResponse.json({ error: msg }, { status });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

