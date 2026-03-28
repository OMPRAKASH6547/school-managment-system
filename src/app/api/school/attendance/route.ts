import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSelectedBranchId, resolveBranchIdForOrganization, requireOrganization } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { firstZodIssueMessage, LIMITS, zCuidId, zIsoDateString } from "@/lib/field-validation";

const bodySchema = z.object({
  date: zIsoDateString,
  entries: z
    .array(
      z.object({
        studentId: zCuidId,
        status: z.enum(["present", "absent", "late", "leave"]),
      }),
    )
    .min(1)
    .max(LIMITS.maxAttendanceEntries),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    requireOrganization(session);
    if (session.role !== "super_admin" && session.role !== "school_admin" && session.role !== "teacher") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    const orgId = session.organizationId!;
    const branchId = await resolveBranchIdForOrganization(orgId, await getSelectedBranchId());

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
      return NextResponse.json({ error: firstZodIssueMessage(e) }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    requireOrganization(session);
    if (
      session?.role !== "super_admin" &&
      session?.role !== "school_admin" &&
      session?.role !== "admin" &&
      session?.role !== "teacher"
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    const orgId = session.organizationId!;
    const branchId = await resolveBranchIdForOrganization(orgId, await getSelectedBranchId());

    const dateStr = req.nextUrl.searchParams.get("date");
    const classId = req.nextUrl.searchParams.get("classId");
    const studentId = req.nextUrl.searchParams.get("studentId");
    const month = req.nextUrl.searchParams.get("month");

    let allowedClassIds: string[] | null = null;
    if (session.role === "teacher") {
      const teacherStaff = await prisma.staff.findFirst({
        where: { email: session.email, organizationId: orgId, branchId, role: "teacher" },
        select: { id: true },
      });
      if (!teacherStaff) return NextResponse.json({ statuses: {} });

      const assignments = await prisma.teacherAssignment.findMany({
        where: { teacherStaffId: teacherStaff.id, organizationId: orgId, branchId },
        select: { classId: true },
      });
      allowedClassIds = assignments.map((a) => a.classId);
      if (allowedClassIds.length === 0) return NextResponse.json({ statuses: {} });
    }

    // Student-wise attendance history (teacher/admin/school_admin/super_admin).
    if (studentId) {
      const student = await prisma.student.findFirst({
        where: { id: studentId, organizationId: orgId, branchId, status: "active" },
        select: { id: true, firstName: true, lastName: true, classId: true, class: { select: { name: true } } },
      });
      if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });
      if (session.role === "teacher") {
        if (!student.classId || !(allowedClassIds ?? []).includes(student.classId)) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }
      }

      let start: Date;
      let end: Date;
      if (month && /^\d{4}-\d{2}$/.test(month)) {
        start = new Date(`${month}-01T00:00:00.000Z`);
      } else {
        const now = new Date();
        start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      }
      end = new Date(start);
      end.setUTCMonth(start.getUTCMonth() + 1);

      const rows = await prisma.attendance.findMany({
        where: {
          organizationId: orgId,
          branchId,
          studentId: student.id,
          date: { gte: start, lt: end },
        },
        orderBy: { date: "asc" },
        select: { date: true, status: true },
      });
      const summary = { present: 0, absent: 0, late: 0, leave: 0 };
      for (const row of rows) {
        if (row.status in summary) summary[row.status as keyof typeof summary] += 1;
      }
      return NextResponse.json({
        student: {
          id: student.id,
          name: `${student.firstName} ${student.lastName}`,
          className: student.class?.name ?? null,
        },
        month: `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, "0")}`,
        summary,
        records: rows.map((r) => ({ date: r.date.toISOString().slice(0, 10), status: r.status })),
      });
    }

    if (!dateStr) return NextResponse.json({ statuses: {} });

    const start = new Date(dateStr);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 1);

    let studentWhere: Record<string, unknown> = {
      organizationId: orgId,
      branchId,
      status: "active",
    };

    if (classId) {
      studentWhere = { ...studentWhere, classId };
    }

    // Teacher can only view attendance for assigned classes.
    if (session.role === "teacher") {
      if (classId && !(allowedClassIds ?? []).includes(classId)) return NextResponse.json({ statuses: {} });
      studentWhere = { ...studentWhere, classId: { in: allowedClassIds ?? [] } };
    }

    const students = await prisma.student.findMany({
      where: studentWhere as any,
      select: { id: true },
    });
    const studentIds = students.map((s) => s.id);
    if (studentIds.length === 0) return NextResponse.json({ statuses: {} });

    const attendanceRows = await prisma.attendance.findMany({
      where: {
        organizationId: orgId,
        branchId,
        studentId: { in: studentIds },
        date: { gte: start, lt: end },
      },
      select: { studentId: true, status: true },
    });

    const statuses = Object.fromEntries(attendanceRows.map((r) => [r.studentId, r.status]));
    return NextResponse.json({ statuses });
  } catch (e) {
    return NextResponse.json({ error: "Failed to load attendance" }, { status: 500 });
  }
}
