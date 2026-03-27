import { NextRequest, NextResponse } from "next/server";
import { getSession, getSelectedBranchId, resolveBranchIdForOrganization, requireOrganization } from "@/lib/auth";
import { prisma } from "@/lib/db";

function getMonthRange(monthParam: string) {
  const [yearStr, monthStr] = monthParam.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr); // 1-12

  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, 1, 0, 0, 0));
  return { start, end };
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  requireOrganization(session);
  if (session.role !== "teacher") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const orgId = session.organizationId!;
  const cookieBranch = await getSelectedBranchId();
  const branchId = await resolveBranchIdForOrganization(orgId, cookieBranch);

  const monthParam = req.nextUrl.searchParams.get("month")?.trim() ?? new Date().toISOString().slice(0, 7);
  const { start, end } = getMonthRange(monthParam);

  const teacherStaff = await prisma.staff.findFirst({
    where: { email: session.email, organizationId: orgId, branchId, role: "teacher" },
    select: { id: true },
  });
  if (!teacherStaff) return NextResponse.json({ students: [] });

  const assigned = await prisma.teacherAssignment.findMany({
    where: { teacherStaffId: teacherStaff.id, organizationId: orgId, branchId },
    select: { classId: true },
  });
  const classIds = assigned.map((a) => a.classId);
  if (classIds.length === 0) return NextResponse.json({ students: [] });

  const students = await prisma.student.findMany({
    where: {
      organizationId: orgId,
      branchId,
      classId: { in: classIds },
      status: "active",
    },
    select: { id: true, firstName: true, lastName: true, rollNo: true, guardianPhone: true },
  });

  const studentIds = students.map((s) => s.id);
  if (studentIds.length === 0) return NextResponse.json({ students: [] });

  const attendanceRows = await prisma.attendance.findMany({
    where: {
      organizationId: orgId,
      branchId,
      studentId: { in: studentIds },
      date: { gte: start, lt: end },
    },
    select: { studentId: true, status: true },
  });

  const countsByStudent = new Map<
    string,
    { present: number; absent: number; late: number; leave: number }
  >();
  for (const s of students) {
    countsByStudent.set(s.id, { present: 0, absent: 0, late: 0, leave: 0 });
  }

  for (const row of attendanceRows) {
    const c = countsByStudent.get(row.studentId);
    if (!c) continue;
    if (row.status === "present") c.present += 1;
    else if (row.status === "absent") c.absent += 1;
    else if (row.status === "late") c.late += 1;
    else if (row.status === "leave") c.leave += 1;
  }

  const payload = students.map((s) => ({
    studentId: s.id,
    firstName: s.firstName,
    lastName: s.lastName,
    rollNo: s.rollNo,
    guardianPhone: s.guardianPhone,
    counts: countsByStudent.get(s.id) ?? { present: 0, absent: 0, late: 0, leave: 0 },
  }));

  return NextResponse.json({ students: payload });
}

