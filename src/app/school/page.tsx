import { getSession, getResolvedBranchIdForSchool } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { DashboardFilters } from "@/app/components/DashboardFilters";
import { DashboardKPIs } from "@/app/components/DashboardKPIs";
import { DashboardCharts } from "@/app/components/DashboardCharts";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function SchoolDashboard({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === "teacher") redirect("/school/teacher");

  const orgId = session.organizationId!;
  const branchId = await getResolvedBranchIdForSchool(session);

  // Some "teacher" accounts are stored with `User.role = "staff"`.
  // If the staff record has `Staff.role = "teacher"`, send them to the teacher dashboard.
  if (session.role === "staff") {
    const staffTeacher = await prisma.staff.findFirst({
      where: { email: session.email, organizationId: orgId, branchId, role: "teacher" },
      select: { id: true },
    });

    if (staffTeacher) redirect("/school/teacher");
    redirect("/school/staff-attendance");
  }

  const monthParam =
    typeof searchParams?.month === "string" ? searchParams.month : new Date().toISOString().slice(0, 7);
  const classDateParam =
    typeof searchParams?.classDate === "string" ? searchParams.classDate : new Date().toISOString().slice(0, 10);
  const [yearStr, monthStr] = monthParam.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr); // 1-12
  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, 1, 0, 0, 0));
  const pendingPage = Math.max(
    1,
    Number(typeof searchParams?.pendingPage === "string" ? searchParams.pendingPage : "1") || 1
  );
  const pendingPageSize = 8;

  const [
    students,
    classes,
    payments,
    bookSalesData,
    subscription,
    pendingPayments,
    pendingPaymentsCount,
    classSessionsOnDate,
  ] = await Promise.all([
    prisma.student.findMany({
      where: { organizationId: orgId, branchId },
      select: { id: true, gender: true, status: true, classId: true },
    }),
    prisma.class.findMany({
      where: { organizationId: orgId, branchId, status: "active" },
      include: { _count: { select: { students: true } } },
    }),
    prisma.payment.findMany({
      where: {
        organizationId: orgId,
        branchId,
        status: { in: ["verified", "completed"] },
        paidAt: { gte: start, lt: end },
      },
      select: { amount: true },
    }),
    prisma.bookSale.findMany({
      where: { organizationId: orgId, branchId, soldAt: { gte: start, lt: end } },
      include: { items: true },
    }),
    prisma.subscription.findUnique({
      where: { organizationId: orgId },
      include: { plan: true },
    }),
    prisma.payment.findMany({
      where: { organizationId: orgId, branchId, verifiedAt: null },
      orderBy: { paidAt: "desc" },
      skip: (pendingPage - 1) * pendingPageSize,
      take: pendingPageSize,
      include: { student: { select: { firstName: true, lastName: true, rollNo: true } } },
    }),
    prisma.payment.count({
      where: { organizationId: orgId, branchId, verifiedAt: null },
    }),
    prisma.teacherClassSession.findMany({
      where: {
        organizationId: orgId,
        branchId,
        startedAt: {
          gte: new Date(`${classDateParam}T00:00:00.000Z`),
          lt: new Date(`${classDateParam}T23:59:59.999Z`),
        },
      },
      orderBy: { startedAt: "asc" },
      select: {
        id: true,
        teacherStaffId: true,
        classId: true,
        startedAt: true,
        endedAt: true,
      },
    }),
  ]);

  const sessionTeacherIds = Array.from(new Set(classSessionsOnDate.map((s) => s.teacherStaffId)));
  const sessionClassIds = Array.from(new Set(classSessionsOnDate.map((s) => s.classId)));
  const [sessionTeachers, sessionClasses] = await Promise.all([
    prisma.staff.findMany({
      where: { id: { in: sessionTeacherIds } },
      select: { id: true, firstName: true, lastName: true, employeeId: true },
    }),
    prisma.class.findMany({
      where: { id: { in: sessionClassIds } },
      select: { id: true, name: true, section: true },
    }),
  ]);
  const teacherMap = new Map(sessionTeachers.map((t) => [t.id, t]));
  const classMap = new Map(sessionClasses.map((c) => [c.id, c]));

  const totalStudents = students.length;
  const boys = students.filter((s) => s.gender === "male").length;
  const girls = students.filter((s) => s.gender === "female").length;
  const active = students.filter((s) => s.status === "active").length;
  const left = students.filter((s) => s.status === "left" || s.status === "graduated").length;

  const totalFee = subscription?.plan?.price ? totalStudents * subscription.plan.price : 0;
  const collected = payments.reduce((s, p) => s + p.amount, 0);
  const pending = Math.max(0, totalFee - collected);

  let itemsSold = 0;
  // Revenue KPI shows fee revenue (payments) for the selected month.
  let revenue = collected;
  for (const sale of bookSalesData) {
    for (const item of sale.items) {
      itemsSold += item.quantity;
    }
  }

  const classStrength = classes.map((c) => ({
    name: c.name,
    strength: c._count.students,
  }));

  const [presentCount, absentCount, lateCount, leaveCount] = await Promise.all([
    prisma.attendance.count({
      where: { organizationId: orgId, branchId, date: { gte: start, lt: end }, status: "present" },
    }),
    prisma.attendance.count({
      where: { organizationId: orgId, branchId, date: { gte: start, lt: end }, status: "absent" },
    }),
    prisma.attendance.count({
      where: { organizationId: orgId, branchId, date: { gte: start, lt: end }, status: "late" },
    }),
    prisma.attendance.count({
      where: { organizationId: orgId, branchId, date: { gte: start, lt: end }, status: "leave" },
    }),
  ]);
  const pendingPages = Math.max(1, Math.ceil(pendingPaymentsCount / pendingPageSize));
  const pendingHref = (p: number) =>
    `/school?month=${encodeURIComponent(monthParam)}&pendingPage=${p}`;

  return (
    <>
      <h1 className="text-2xl font-bold text-primary-600">School Admin Dashboard</h1>

      <DashboardFilters />

      <DashboardKPIs
        total={totalStudents}
        boys={boys}
        girls={girls}
        active={active}
        left={left}
        totalFee={totalFee}
        collected={collected}
        pending={pending}
        itemsSold={itemsSold}
        revenue={revenue}
      />

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4 shadow-sm text-center">
          <p className="text-lg sm:text-xl font-bold text-school-green">{presentCount}</p>
          <p className="text-xs sm:text-sm text-slate-500">Present</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4 shadow-sm text-center">
          <p className="text-lg sm:text-xl font-bold text-red-600">{absentCount}</p>
          <p className="text-xs sm:text-sm text-slate-500">Absent</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4 shadow-sm text-center">
          <p className="text-lg sm:text-xl font-bold text-primary-600">{lateCount}</p>
          <p className="text-xs sm:text-sm text-slate-500">Late</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4 shadow-sm text-center">
          <p className="text-lg sm:text-xl font-bold text-slate-700">{leaveCount}</p>
          <p className="text-xs sm:text-sm text-slate-500">Leave</p>
        </div>
      </div>

      <div className="mt-4">
        <Link href="/school/attendance" className="text-sm text-primary-600 hover:underline">
          Open Attendance page to view attendance records
        </Link>
      </div>

      <DashboardCharts classStrength={classStrength} boys={boys} girls={girls} />

      <div className="mt-8 card overflow-hidden p-0">
        <div className="flex flex-wrap items-center justify-between gap-2 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Teacher class sessions (date-wise)</h2>
          <form className="flex items-center gap-2" method="GET">
            <input type="hidden" name="month" value={monthParam} />
            <input
              type="date"
              name="classDate"
              defaultValue={classDateParam}
              className="input-field"
            />
            <button className="btn-secondary" type="submit">
              Show
            </button>
          </form>
        </div>
        {classSessionsOnDate.length === 0 ? (
          <div className="px-6 pb-6 text-slate-500">No class sessions for selected date.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-xs sm:text-sm whitespace-nowrap">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Teacher</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Employee ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Class</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Started</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Completed</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {classSessionsOnDate.map((s) => {
                  const t = teacherMap.get(s.teacherStaffId);
                  const c = classMap.get(s.classId);
                  return (
                    <tr key={s.id}>
                      <td className="px-6 py-4 text-slate-900">
                        {t ? `${t.firstName} ${t.lastName}` : "—"}
                      </td>
                      <td className="px-6 py-4 text-slate-600">{t?.employeeId ?? "—"}</td>
                      <td className="px-6 py-4 text-slate-600">
                        {c ? `${c.name}${c.section ? `-${c.section}` : ""}` : "—"}
                      </td>
                      <td className="px-6 py-4 text-slate-600">{new Date(s.startedAt).toLocaleTimeString()}</td>
                      <td className="px-6 py-4 text-slate-600">{s.endedAt ? new Date(s.endedAt).toLocaleTimeString() : "—"}</td>
                      <td className="px-6 py-4">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${s.endedAt ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>
                          {s.endedAt ? "Completed" : "In progress"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-8 card overflow-hidden p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Pending payment verification</h2>
          <Link href="/school/fees" className="text-sm text-primary-600 hover:underline">
            Open fee management
          </Link>
        </div>
        {pendingPayments.length === 0 ? (
          <div className="px-6 pb-6 text-slate-500">No pending payments.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-xs sm:text-sm whitespace-nowrap">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Student</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Method</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Date</th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase text-slate-500">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {pendingPayments.map((p) => (
                  <tr key={p.id}>
                    <td className="px-6 py-4 text-slate-900">
                      {p.student?.firstName} {p.student?.lastName} {p.student?.rollNo ? `(${p.student.rollNo})` : ""}
                    </td>
                    <td className="px-6 py-4 text-slate-600">INR {p.amount}</td>
                    <td className="px-6 py-4 text-slate-600">{p.method}</td>
                    <td className="px-6 py-4 text-slate-600">{new Date(p.paidAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-right">
                      <Link href="/school/payment-verification" className="text-sm text-primary-600 hover:underline">
                        Verify in Payment Verification
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-3 text-sm text-slate-600">
          <span>
            Page {pendingPage} of {pendingPages} ({pendingPaymentsCount} pending)
          </span>
          <div className="flex gap-2">
            {pendingPage > 1 && (
              <a className="btn-secondary" href={pendingHref(pendingPage - 1)}>
                Previous
              </a>
            )}
            {pendingPage < pendingPages && (
              <a className="btn-secondary" href={pendingHref(pendingPage + 1)}>
                Next
              </a>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
