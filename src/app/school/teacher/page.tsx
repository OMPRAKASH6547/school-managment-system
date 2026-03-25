import { redirect } from "next/navigation";
import { getSession, getSelectedBranchId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { TeacherClassTrackingControls } from "@/app/components/TeacherClassTrackingControls";

export default async function TeacherDashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "teacher") redirect("/school");

  const orgId = session.organizationId!;
  const branchId = await getSelectedBranchId();

  const teacherStaff = await prisma.staff.findFirst({
    where: { email: session.email, organizationId: orgId, branchId: branchId ?? undefined, role: "teacher" },
    select: { id: true },
  });

  if (!teacherStaff || !branchId) {
    return (
      <>
        <div className="mb-6">
          <Link href="/school" className="text-sm text-primary-600 hover:underline">← Back</Link>
        </div>
        <div className="text-red-600">Teacher not found or no branch selected.</div>
      </>
    );
  }

  const assigned = await prisma.teacherAssignment.findMany({
    where: { teacherStaffId: teacherStaff.id, organizationId: orgId, branchId },
    select: { classId: true },
  });
  const assignedClassIds = assigned.map((a) => a.classId);

  const classes = await prisma.class.findMany({
    where: { id: { in: assignedClassIds }, organizationId: orgId, branchId, status: "active" },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const activeSessions = await prisma.teacherClassSession.findMany({
    where: { teacherStaffId: teacherStaff.id, branchId, endedAt: null },
    select: { classId: true },
  });
  const activeClassIds = activeSessions.map((s) => s.classId);

  return (
    <>
      <div className="mb-6">
        <Link href="/school" className="text-sm text-primary-600 hover:underline">← School Dashboard</Link>
      </div>
      <h1 className="text-2xl font-bold text-primary-600">Teacher Dashboard</h1>
      <p className="mt-1 text-slate-600">Start/end class tracking and mark student attendance for assigned classes.</p>

      {/* Using client component for actions */}
      <TeacherClassTrackingControls
        classes={classes}
        activeClassIds={activeClassIds}
      />
    </>
  );
}

