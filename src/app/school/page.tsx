import { getSession, getResolvedBranchIdForSchool } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { DashboardFilters } from "@/app/components/DashboardFilters";
import { DashboardKPIs } from "@/app/components/DashboardKPIs";
import { DashboardCharts } from "@/app/components/DashboardCharts";
import { DashboardPanelNav } from "@/app/components/DashboardPanelNav";
import { DashboardTeacherSessionActions } from "@/app/components/DashboardTeacherSessionActions";
import { VerifyPaymentButton } from "@/app/components/VerifyPaymentButton";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

const SESSION_PAGE_SIZE = 10;
const PENDING_PAGE_SIZE = 8;

const DASHBOARD_PANELS = new Set(["all", "kpis", "attendance", "charts", "sessions", "pending"]);

type DashboardPagePatch = { pendingPage?: number; sessionPage?: number };

type DashboardPanelId = "kpis" | "attendance" | "charts" | "sessions" | "pending";

/** Preserves filters and panel; use for pagination / panel-aware links on the school dashboard. */
function schoolDashboardHrefFrom(
  raw: Record<string, string | string[] | undefined> | undefined,
  overrides: {
    month: string;
    classDate: string;
    pendingPage: number;
    sessionPage: number;
    panel: string;
  },
) {
  const p = new URLSearchParams();
  if (raw) {
    for (const [key, val] of Object.entries(raw)) {
      if (val === undefined) continue;
      const s = typeof val === "string" ? val : Array.isArray(val) ? val[0] : undefined;
      if (s) p.set(key, s);
    }
  }
  p.set("month", overrides.month);
  p.set("classDate", overrides.classDate);
  if (overrides.pendingPage > 1) p.set("pendingPage", String(overrides.pendingPage));
  else p.delete("pendingPage");
  if (overrides.sessionPage > 1) p.set("sessionPage", String(overrides.sessionPage));
  else p.delete("sessionPage");
  if (overrides.panel && overrides.panel !== "all") p.set("panel", overrides.panel);
  else p.delete("panel");
  const q = p.toString();
  return q ? `/school?${q}` : "/school";
}

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
  const sessionPage = Math.max(
    1,
    Number(typeof searchParams?.sessionPage === "string" ? searchParams.sessionPage : "1") || 1
  );

  const sessionDayStart = new Date(`${classDateParam}T00:00:00.000Z`);
  const sessionDayEnd = new Date(`${classDateParam}T23:59:59.999Z`);
  const teacherSessionWhere = {
    organizationId: orgId,
    branchId,
    startedAt: { gte: sessionDayStart, lt: sessionDayEnd },
  } as const;

  const [
    students,
    classes,
    payments,
    bookSalesData,
    subscription,
    pendingPayments,
    pendingPaymentsCount,
    classSessionsCount,
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
      skip: (pendingPage - 1) * PENDING_PAGE_SIZE,
      take: PENDING_PAGE_SIZE,
      include: { student: { select: { firstName: true, lastName: true, rollNo: true } } },
    }),
    prisma.payment.count({
      where: { organizationId: orgId, branchId, verifiedAt: null },
    }),
    prisma.teacherClassSession.count({ where: teacherSessionWhere }),
    prisma.teacherClassSession.findMany({
      where: teacherSessionWhere,
      orderBy: { startedAt: "asc" },
      skip: (sessionPage - 1) * SESSION_PAGE_SIZE,
      take: SESSION_PAGE_SIZE,
      select: {
        id: true,
        teacherStaffId: true,
        classId: true,
        startedAt: true,
        endedAt: true,
        verifiedAt: true,
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
  const pendingPages = Math.max(1, Math.ceil(pendingPaymentsCount / PENDING_PAGE_SIZE));
  const sessionPages = Math.max(1, Math.ceil(classSessionsCount / SESSION_PAGE_SIZE));

  const panelRaw = typeof searchParams?.panel === "string" ? searchParams.panel : "all";
  const panel = DASHBOARD_PANELS.has(panelRaw) ? panelRaw : "all";

  const dash = {
    month: monthParam,
    classDate: classDateParam,
    pendingPage,
    sessionPage,
    panel,
  };

  function hrefDash(patch: DashboardPagePatch): string {
    return schoolDashboardHrefFrom(searchParams, {
      ...dash,
      pendingPage: patch.pendingPage ?? pendingPage,
      sessionPage: patch.sessionPage ?? sessionPage,
    });
  }

  function show(id: DashboardPanelId): boolean {
    return panel === "all" || panel === id;
  }

  return (
    <>
      <h1 className="text-2xl font-bold text-primary-600">School Admin Dashboard</h1>

      <Suspense fallback={<div className="mt-4 h-14 animate-pulse rounded-xl bg-slate-100" aria-hidden />}>
        <DashboardPanelNav />
      </Suspense>

      <DashboardFilters
        classes={classes.map((c) => ({ id: c.id, name: c.name, section: c.section }))}
      />

      {show("kpis") ? (
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
      ) : null}

      {show("attendance") ? (
        <>
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
        </>
      ) : null}

      {show("charts") ? (
      <DashboardCharts classStrength={classStrength} boys={boys} girls={girls} />
      ) : null}

      {show("sessions") ? (
      <div className="mt-8 card overflow-hidden p-0">
        <div className="flex flex-wrap items-center justify-between gap-2 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Teacher class sessions (date-wise)</h2>
          <form className="flex flex-wrap items-center gap-2" method="GET">
            <input type="hidden" name="month" value={monthParam} />
            {panel !== "all" ? <input type="hidden" name="panel" value={panel} /> : null}
            <input
              type="date"
              name="classDate"
              defaultValue={classDateParam}
              className="input-field"
            />
            <button className="btn-secondary" type="submit">
              Show
            </button>
            <span className="text-xs text-slate-500">
              {classSessionsCount} session{classSessionsCount === 1 ? "" : "s"} · {SESSION_PAGE_SIZE} per page
            </span>
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
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase text-slate-500">Actions</th>
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
                        {s.verifiedAt ? (
                          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                            Admin verified
                          </span>
                        ) : (
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              s.endedAt ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {s.endedAt ? "Completed" : "In progress"}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <DashboardTeacherSessionActions sessionId={s.id} verifiedAt={s.verifiedAt} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {classSessionsCount > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 px-6 py-3 text-sm text-slate-600">
            <span>
              Page {sessionPage} of {sessionPages} ({classSessionsCount} total)
            </span>
            <div className="flex gap-2">
              {sessionPage > 1 ? (
                <a
                  className="btn-secondary"
                  href={hrefDash({ sessionPage: sessionPage - 1 })}
                >
                  Previous
                </a>
              ) : null}
              {sessionPage < sessionPages ? (
                <a
                  className="btn-secondary"
                  href={hrefDash({ sessionPage: sessionPage + 1 })}
                >
                  Next
                </a>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
      ) : null}

      {show("pending") ? (
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
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase text-slate-500">Actions</th>
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
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <VerifyPaymentButton paymentId={p.id} />
                        <Link href="/school/payment-verification" className="text-sm text-primary-600 hover:underline">
                          Open queue
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-3 text-sm text-slate-600">
          <span>
            Page {pendingPage} of {pendingPages} ({pendingPaymentsCount} pending) · {PENDING_PAGE_SIZE} per page
          </span>
          <div className="flex gap-2">
            {pendingPage > 1 && (
              <a
                className="btn-secondary"
                href={hrefDash({ pendingPage: pendingPage - 1 })}
              >
                Previous
              </a>
            )}
            {pendingPage < pendingPages && (
              <a
                className="btn-secondary"
                href={hrefDash({ pendingPage: pendingPage + 1 })}
              >
                Next
              </a>
            )}
          </div>
        </div>
      </div>
      ) : null}
    </>
  );
}
