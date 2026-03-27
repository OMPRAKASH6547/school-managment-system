import { redirect } from "next/navigation";
import { getSession, getResolvedBranchIdForSchool } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { TeacherClassTrackingControls } from "@/app/components/TeacherClassTrackingControls";
import { TeacherMonthlyAttendanceReport } from "@/app/components/TeacherMonthlyAttendanceReport";

export default async function TeacherDashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  // Teachers are stored in `Staff.role`, but `User.role` may be `staff`.
  // Allow both so class start/end UI works for teacher-staff accounts.
  if (session.role !== "teacher" && session.role !== "staff") redirect("/school");

  const orgId = session.organizationId!;
  const branchId = await getResolvedBranchIdForSchool(session);

  const teacherStaff = await prisma.staff.findFirst({
    where: { email: session.email, organizationId: orgId, branchId, role: "teacher" },
    select: { id: true, salary: true, firstName: true, lastName: true },
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
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0));
  const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0));
  const [collectedPayments, staffPayments] = await Promise.all([
    prisma.payment.findMany({
      where: { organizationId: orgId, branchId, collectedByStaffId: teacherStaff.id, paidAt: { gte: monthStart, lt: monthEnd } },
      include: { student: true, staff: true },
      orderBy: { paidAt: "desc" },
      take: 20,
    }),
    prisma.payment.findMany({
      where: { organizationId: orgId, branchId, staffId: teacherStaff.id, paidAt: { gte: monthStart, lt: monthEnd } },
      orderBy: { paidAt: "desc" },
      take: 20,
    }),
  ]);
  const collectedTotal = collectedPayments.reduce((s, p) => s + p.amount, 0);
  const staffPaidTotal = staffPayments.filter((p) => p.verifiedAt).reduce((s, p) => s + p.amount, 0);
  const salary = teacherStaff.salary ?? 0;
  const remainingSalary = salary > 0 ? Math.max(0, salary - staffPaidTotal) : 0;

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Link href="/school" className="btn-secondary">School Dashboard</Link>
        <Link href="/school/fees?payerType=staff" className="btn-secondary">Fee Dashboard</Link>
      </div>
      <h1 className="text-2xl font-bold text-primary-600">Teacher Dashboard</h1>
      <p className="mt-1 text-slate-600">Start/end class tracking and mark student attendance for assigned classes.</p>

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-blue-700">Monthly Salary</p>
          <p className="mt-2 text-2xl font-bold text-blue-900">₹{salary.toFixed(2)}</p>
        </div>
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-emerald-700">Collected Salary</p>
          <p className="mt-2 text-2xl font-bold text-emerald-900">₹{staffPaidTotal.toFixed(2)}</p>
        </div>
        <div className="rounded-xl border border-amber-100 bg-amber-50 p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-amber-700">Remaining Salary</p>
          <p className="mt-2 text-2xl font-bold text-amber-900">₹{remainingSalary.toFixed(2)}</p>
        </div>
        <div className="rounded-xl border border-violet-100 bg-violet-50 p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-violet-700">Payments Collected (Month)</p>
          <p className="mt-2 text-2xl font-bold text-violet-900">₹{collectedTotal.toFixed(2)}</p>
        </div>
      </div>

      {/* Using client component for actions */}
      <TeacherClassTrackingControls
        classes={classes}
        activeClassIds={activeClassIds}
      />

      <TeacherMonthlyAttendanceReport />

      <div className="mt-6 card overflow-hidden p-0">
        <h2 className="px-6 py-4 text-lg font-semibold text-slate-900">Payments collected by you (this month)</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm whitespace-nowrap">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Payer</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {collectedPayments.map((p) => (
                <tr key={p.id}>
                  <td className="px-6 py-3 text-slate-900">
                    {p.payerType === "staff"
                      ? `${p.staff?.firstName ?? ""} ${p.staff?.lastName ?? ""}`.trim() || "—"
                      : `${p.student?.firstName ?? ""} ${p.student?.lastName ?? ""}`.trim() || "—"}
                  </td>
                  <td className="px-6 py-3 text-slate-600 capitalize">{p.payerType}</td>
                  <td className="px-6 py-3 text-slate-600">₹{p.amount}</td>
                  <td className="px-6 py-3 text-slate-600">{new Date(p.paidAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 card overflow-hidden p-0">
        <h2 className="px-6 py-4 text-lg font-semibold text-slate-900">
          Your salary payment details ({teacherStaff.firstName} {teacherStaff.lastName})
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm whitespace-nowrap">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Method</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {staffPayments.map((p) => (
                <tr key={p.id}>
                  <td className="px-6 py-3 text-slate-700">{new Date(p.paidAt).toLocaleDateString()}</td>
                  <td className="px-6 py-3 text-slate-700">₹{p.amount}</td>
                  <td className="px-6 py-3 text-slate-700">{p.method}</td>
                  <td className="px-6 py-3 text-slate-700">{p.verifiedAt ? "Verified" : "Pending"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

