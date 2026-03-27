import { getSession, getResolvedBranchIdForSchool } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AttendanceForm } from "@/app/components/AttendanceForm";
import { redirect } from "next/navigation";

export default async function SchoolAttendancePage() {
  const session = await getSession();
  const orgId = session?.organizationId!;
  const branchId = await getResolvedBranchIdForSchool(session);

  if (session?.role === "staff") redirect("/school/staff-attendance");
  if (session?.role === "accountant") redirect("/school");

  if (session?.role === "teacher" && branchId) {
    const teacherStaff = await prisma.staff.findFirst({
      where: { email: session.email, organizationId: orgId, branchId, role: "teacher" },
      select: { id: true },
    });

    if (!teacherStaff) {
      return <div className="mt-6 text-sm text-red-600">Teacher not found for this branch.</div>;
    }

    const assigned = await prisma.teacherAssignment.findMany({
      where: { organizationId: orgId, branchId, teacherStaffId: teacherStaff.id },
      select: { classId: true },
    });
    const assignedClassIds = assigned.map((a) => a.classId);

    const [classes, students] = await Promise.all([
      prisma.class.findMany({
        where: { organizationId: orgId, branchId, id: { in: assignedClassIds }, status: "active" },
        orderBy: { name: "asc" },
      }),
      prisma.student.findMany({
        where: { organizationId: orgId, branchId, classId: { in: assignedClassIds }, status: "active" },
        orderBy: [{ classId: "asc" }, { lastName: "asc" }, { firstName: "asc" }],
        include: { class: true },
      }),
    ]);

    const today = new Date().toISOString().slice(0, 10);
    return (
      <>
        <h1 className="text-2xl font-bold text-slate-900">Attendance</h1>
        <div className="mt-6 card">
          <AttendanceForm students={students} classes={classes} defaultDate={today} />
        </div>
      </>
    );
  }

  const [students, classes] = await Promise.all([
    prisma.student.findMany({
      where: { organizationId: orgId, branchId, status: "active" },
      orderBy: [{ classId: "asc" }, { lastName: "asc" }, { firstName: "asc" }],
      include: { class: true },
    }),
    prisma.class.findMany({
      where: { organizationId: orgId, branchId, status: "active" },
      orderBy: { name: "asc" },
    }),
  ]);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <h1 className="text-2xl font-bold text-slate-900">Attendance</h1>
      <div className="mt-6 card">
        <AttendanceForm students={students} classes={classes} defaultDate={today} />
      </div>
    </>
  );
}
