import { getSession, getResolvedBranchIdForSchool } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { DashboardFilters } from "@/app/components/DashboardFilters";
import { DashboardKPIs } from "@/app/components/DashboardKPIs";
import { DashboardCharts } from "@/app/components/DashboardCharts";
import { DashboardPanelNav } from "@/app/components/DashboardPanelNav";
import { DashboardTeacherSessionActions } from "@/app/components/DashboardTeacherSessionActions";
import { VerifyPaymentButton } from "@/app/components/VerifyPaymentButton";
import { CoachingQuickEnrollmentForm } from "@/app/components/CoachingQuickEnrollmentForm";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

const SESSION_PAGE_SIZE = 10;
const PENDING_PAGE_SIZE = 8;

const DASHBOARD_PANELS = new Set(["all", "kpis", "attendance", "charts", "collections", "sessions", "pending"]);

type DashboardPagePatch = { pendingPage?: number; sessionPage?: number };

type DashboardPanelId = "kpis" | "attendance" | "charts" | "collections" | "sessions" | "pending";

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
  const organization = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { type: true },
  });
  const isCoaching = (organization?.type ?? "").toLowerCase() === "coaching";

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
  const collectionViewRaw = typeof searchParams?.collectionView === "string" ? searchParams.collectionView : "month";
  const collectionView: "month" | "year" = collectionViewRaw === "year" ? "year" : "month";
  const collectionMonthParam =
    typeof searchParams?.collectionMonth === "string" ? searchParams.collectionMonth : monthParam;
  const collectionYearParam =
    typeof searchParams?.collectionYear === "string" ? searchParams.collectionYear : monthParam.slice(0, 4);
  const [yearStr, monthStr] = monthParam.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr); // 1-12
  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, 1, 0, 0, 0));
  const collectionPeriodStart =
    collectionView === "year"
      ? new Date(Date.UTC(Number(collectionYearParam), 0, 1, 0, 0, 0))
      : new Date(`${collectionMonthParam}-01T00:00:00.000Z`);
  const collectionPeriodEnd =
    collectionView === "year"
      ? new Date(Date.UTC(Number(collectionYearParam) + 1, 0, 1, 0, 0, 0))
      : new Date(
          Date.UTC(
            Number(collectionMonthParam.slice(0, 4)),
            Number(collectionMonthParam.slice(5, 7)),
            1,
            0,
            0,
            0
          )
        );
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
    feePlans,
    payments,
    submittedPaymentsInMonth,
    bookSalesData,
    subscription,
    pendingPayments,
    pendingPaymentsCount,
    classSessionsCount,
    classSessionsOnDate,
    liveSessions,
    examsInMonth,
    collectionPayments,
  ] = await Promise.all([
    prisma.student.findMany({
      where: { organizationId: orgId, branchId },
      select: { id: true, firstName: true, lastName: true, gender: true, status: true, classId: true },
    }),
    prisma.class.findMany({
      where: { organizationId: orgId, branchId, status: "active" },
      include: { _count: { select: { students: true } } },
    }),
    prisma.feePlan.findMany({
      where: { organizationId: orgId, branchId, isActive: true, payerType: "student" },
      select: { id: true, amount: true, frequency: true, classId: true, createdAt: true },
    }),
    prisma.payment.findMany({
      where: {
        organizationId: orgId,
        branchId,
        status: { in: ["verified", "completed"] },
        paidAt: { gte: start, lt: end },
      },
      select: { amount: true, payerType: true, feePlanId: true, studentId: true },
    }),
    prisma.payment.findMany({
      where: {
        organizationId: orgId,
        branchId,
        paidAt: { gte: start, lt: end },
      },
      select: { amount: true, payerType: true },
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
    prisma.teacherClassSession.findMany({
      where: { organizationId: orgId, branchId, endedAt: null },
      orderBy: { startedAt: "desc" },
      select: { id: true, teacherStaffId: true, classId: true, startedAt: true },
      take: 6,
    }),
    prisma.exam.findMany({
      where: { organizationId: orgId, branchId, startDate: { gte: start, lt: end } },
      orderBy: { startDate: "desc" },
      select: { id: true, name: true },
      take: 24,
    }),
    prisma.payment.findMany({
      where: {
        organizationId: orgId,
        branchId,
        paidAt: { gte: collectionPeriodStart, lt: collectionPeriodEnd },
      },
      orderBy: { paidAt: "desc" },
      select: {
        id: true,
        amount: true,
        method: true,
        payerType: true,
        paidAt: true,
        verifiedAt: true,
        studentId: true,
        staffId: true,
      },
      take: 500,
    }),
  ]);

  const sessionTeacherIds = Array.from(new Set(classSessionsOnDate.map((s) => s.teacherStaffId)));
  const sessionClassIds = Array.from(new Set(classSessionsOnDate.map((s) => s.classId)));
  const liveTeacherIds = Array.from(new Set(liveSessions.map((s) => s.teacherStaffId)));
  const liveClassIds = Array.from(new Set(liveSessions.map((s) => s.classId)));
  const leaderboardExamIds = examsInMonth.map((e) => e.id);
  const leaderboardResults = leaderboardExamIds.length
    ? await prisma.examResult.findMany({
        where: { organizationId: orgId, branchId, examId: { in: leaderboardExamIds } },
        select: { studentId: true, marksObtained: true },
      })
    : [];
  const leaderboardStudentIds = Array.from(new Set(leaderboardResults.map((r) => r.studentId)));
  const leaderboardStudents = leaderboardStudentIds.length
    ? await prisma.student.findMany({
        where: { id: { in: leaderboardStudentIds } },
        select: { id: true, firstName: true, lastName: true, rollNo: true },
      })
    : [];
  const leaderboardStudentMap = new Map(
    leaderboardStudents.map((s) => [s.id, `${s.firstName} ${s.lastName}`.trim()])
  );
  const [sessionTeachers, sessionClasses] = await Promise.all([
    prisma.staff.findMany({
      where: { id: { in: [...sessionTeacherIds, ...liveTeacherIds] } },
      select: { id: true, firstName: true, lastName: true, employeeId: true },
    }),
    prisma.class.findMany({
      where: { id: { in: [...sessionClassIds, ...liveClassIds] } },
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
  const activeStudents = students.filter((s) => s.status === "active");
  const activeStudentsByClass = new Map<string, number>();
  for (const student of activeStudents) {
    if (!student.classId) continue;
    activeStudentsByClass.set(student.classId, (activeStudentsByClass.get(student.classId) ?? 0) + 1);
  }
  const hasSpecificFeePlans = feePlans.length > 0;
  const currentMonthIndex = Number(monthParam.slice(5, 7)); // 1-12
  const planBasedExpected = feePlans.reduce((sum, plan) => {
    const eligible =
      plan.classId && activeStudentsByClass.has(plan.classId)
        ? activeStudentsByClass.get(plan.classId) ?? 0
        : plan.classId
        ? 0
        : active;
    if (eligible === 0) return sum;
    let multiplier = 0;
    if (plan.frequency === "monthly") multiplier = 1;
    else if (plan.frequency === "quarterly") multiplier = [1, 4, 7, 10].includes(currentMonthIndex) ? 1 : 0;
    else if (plan.frequency === "yearly") multiplier = currentMonthIndex === 1 ? 1 : 0;
    else if (plan.frequency === "one_time") {
      const createdMonth = plan.createdAt.toISOString().slice(0, 7);
      multiplier = createdMonth === monthParam ? 1 : 0;
    }
    return sum + eligible * plan.amount * multiplier;
  }, 0);
  const fallbackExpected = subscription?.plan?.price ? active * subscription.plan.price : 0;
  const totalFee = hasSpecificFeePlans ? planBasedExpected : fallbackExpected;
  const collected = payments
    .filter((p) => p.payerType === "student")
    .reduce((s, p) => s + p.amount, 0);
  const pending = Math.max(0, totalFee - collected);
  const submittedAllFee = submittedPaymentsInMonth.reduce((s, p) => s + p.amount, 0);

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
  const leaderboardMap = new Map<string, number>();
  for (const row of leaderboardResults) {
    leaderboardMap.set(row.studentId, (leaderboardMap.get(row.studentId) ?? 0) + row.marksObtained);
  }
  const leaderboard = Array.from(leaderboardMap.entries())
    .map(([studentId, totalMarks]) => ({ studentId, totalMarks }))
    .sort((a, b) => b.totalMarks - a.totalMarks)
    .slice(0, 8);
  const submittedCollectionTotal = collectionPayments.reduce((s, p) => s + p.amount, 0);
  const verifiedCollectionTotal = collectionPayments
    .filter((p) => !!p.verifiedAt)
    .reduce((s, p) => s + p.amount, 0);
  const pendingCollectionTotal = Math.max(0, submittedCollectionTotal - verifiedCollectionTotal);
  const dailyCollectionMap = new Map<
    string,
    { date: string; submitted: number; verified: number; pending: number; methods: Record<string, number> }
  >();
  const methodSummary = new Map<string, number>();
  for (const row of collectionPayments) {
    const key = row.paidAt.toISOString().slice(0, 10);
    const existing =
      dailyCollectionMap.get(key) ?? { date: key, submitted: 0, verified: 0, pending: 0, methods: {} };
    existing.submitted += row.amount;
    if (row.verifiedAt) existing.verified += row.amount;
    else existing.pending += row.amount;
    existing.methods[row.method] = (existing.methods[row.method] ?? 0) + row.amount;
    dailyCollectionMap.set(key, existing);
    methodSummary.set(row.method, (methodSummary.get(row.method) ?? 0) + row.amount);
  }
  const dailyCollectionRows = Array.from(dailyCollectionMap.values()).sort((a, b) =>
    a.date < b.date ? 1 : -1
  );
  const methodRows = Array.from(methodSummary.entries()).sort((a, b) => b[1] - a[1]);

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
      <h1 className="text-2xl font-bold text-primary-600">
        {isCoaching ? "Coaching Dashboard" : "School Admin Dashboard"}
      </h1>
      {isCoaching ? (
        <p className="mt-1 text-sm text-slate-600">
          Coaching mode enabled: showing lightweight coaching management workflows.
        </p>
      ) : null}

      <Suspense fallback={<div className="mt-4 h-14 animate-pulse rounded-xl bg-slate-100" aria-hidden />}>
        <DashboardPanelNav isCoaching={isCoaching} />
      </Suspense>

      <DashboardFilters
        classes={classes.map((c) => ({ id: c.id, name: c.name, section: c.section }))}
      />

      {isCoaching && panel === "all" ? (
        <section className="mt-6 grid gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm lg:col-span-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Live Class</p>
            <p className="mt-2 text-2xl font-bold text-emerald-900">{liveSessions.length}</p>
            <p className="text-xs text-emerald-700">Active class session{liveSessions.length === 1 ? "" : "s"} now</p>
            <div className="mt-3">
              <Link href="/school/teacher" className="btn-secondary">
                Open Teacher Class Control
              </Link>
            </div>
            {liveSessions.length > 0 ? (
              <ul className="mt-3 space-y-1 text-xs text-emerald-800">
                {liveSessions.slice(0, 4).map((sessionRow) => {
                  const teacher = teacherMap.get(sessionRow.teacherStaffId);
                  const classItem = classMap.get(sessionRow.classId);
                  return (
                    <li key={sessionRow.id}>
                      {teacher ? `${teacher.firstName} ${teacher.lastName}` : "Teacher"} -{" "}
                      {classItem ? `${classItem.name}${classItem.section ? `-${classItem.section}` : ""}` : "Batch"}
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-slate-900">Quick student enrollment</h2>
              <Link href="/school/students/new" className="text-xs text-primary-600 hover:underline">
                Open full admission form
              </Link>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              One-click admission with minimum fields. Full profile can be completed later.
            </p>
            <div className="mt-3">
              <CoachingQuickEnrollmentForm
                organizationId={orgId}
                classes={classes.map((c) => ({ id: c.id, name: `${c.name}${c.section ? `-${c.section}` : ""}` }))}
              />
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-1">
            <h2 className="text-base font-semibold text-slate-900">Rank / leaderboard</h2>
            <p className="mt-1 text-xs text-slate-500">
              Top student totals for exams in selected month.
            </p>
            {leaderboard.length === 0 ? (
              <p className="mt-3 text-xs text-slate-500">No exam marks yet for this month.</p>
            ) : (
              <ol className="mt-3 space-y-1 text-sm">
                {leaderboard.map((row, idx) => (
                  <li key={row.studentId} className="flex items-center justify-between rounded-lg bg-slate-50 px-2 py-1">
                    <span className="truncate">
                      #{idx + 1} {leaderboardStudentMap.get(row.studentId) ?? "Student"}
                    </span>
                    <span className="ml-2 text-slate-600">{row.totalMarks.toFixed(1)}</span>
                  </li>
                ))}
              </ol>
            )}
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <Link href="/school/examinations/new" className="text-primary-600 hover:underline">
                Create test series
              </Link>
              <Link href="/school/examinations" className="text-primary-600 hover:underline">
                Evaluate results
              </Link>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-3">
            <h2 className="text-base font-semibold text-slate-900">Coaching quick actions</h2>
            <div className="mt-3 flex flex-wrap gap-2 text-sm">
              <Link href="/school/classes" className="btn-secondary">Batch-wise scheduling</Link>
              <Link href="/school/examinations/new" className="btn-secondary">Create test series</Link>
              <Link href="/school/examinations" className="btn-secondary">Evaluate tests</Link>
              <Link href="/school/attendance" className="btn-secondary">Daily attendance</Link>
              <Link href="/school/fees" className="btn-secondary">Fee management</Link>
              <Link href="/school/books" className="btn-secondary">Material management</Link>
              <Link href="/school/payment-verification" className="btn-secondary">Basic reports / verifications</Link>
            </div>
          </div>
        </section>
      ) : null}

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
      {show("kpis") ? (
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Calculation Basis</p>
            <p className="mt-1 text-sm text-slate-700">
              {hasSpecificFeePlans
                ? "Using active student fee plans for expected fee."
                : "Using subscription plan price x active students."}
            </p>
          </div>
          <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">All Submitted Fee</p>
            <p className="mt-1 text-2xl font-bold text-indigo-900">INR {submittedAllFee.toFixed(2)}</p>
            <p className="text-xs text-indigo-700">Includes pending + verified for selected month</p>
          </div>
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Verified Collection</p>
            <p className="mt-1 text-2xl font-bold text-emerald-900">INR {collected.toFixed(2)}</p>
            <p className="text-xs text-emerald-700">Student fee verified/completed in selected month</p>
          </div>
        </div>
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

      {show("collections") ? (
      <div className="mt-8 card overflow-hidden p-0">
        <div className="flex flex-wrap items-center justify-between gap-2 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Collection summary (all fee types)</h2>
          <form className="flex flex-wrap items-center gap-2" method="GET">
            <input type="hidden" name="month" value={monthParam} />
            <input type="hidden" name="classDate" value={classDateParam} />
            {panel !== "all" ? <input type="hidden" name="panel" value={panel} /> : null}
            <select
              name="collectionView"
              defaultValue={collectionView}
              className="input-field"
            >
              <option value="month">Month-wise</option>
              <option value="year">Year-wise</option>
            </select>
            <input
              type="month"
              name="collectionMonth"
              defaultValue={collectionMonthParam}
              className="input-field"
            />
            <input
              type="number"
              name="collectionYear"
              min={2000}
              max={2100}
              defaultValue={collectionYearParam}
              className="input-field w-28"
            />
            <button className="btn-secondary" type="submit">
              Apply
            </button>
          </form>
        </div>
        <div className="grid gap-3 px-6 pb-4 md:grid-cols-3">
          <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4">
            <p className="text-xs uppercase tracking-wide text-indigo-700">Submitted Total</p>
            <p className="mt-1 text-xl font-bold text-indigo-900">INR {submittedCollectionTotal.toFixed(2)}</p>
          </div>
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
            <p className="text-xs uppercase tracking-wide text-emerald-700">Verified Total</p>
            <p className="mt-1 text-xl font-bold text-emerald-900">INR {verifiedCollectionTotal.toFixed(2)}</p>
          </div>
          <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
            <p className="text-xs uppercase tracking-wide text-amber-700">Pending Verification</p>
            <p className="mt-1 text-xl font-bold text-amber-900">INR {pendingCollectionTotal.toFixed(2)}</p>
          </div>
        </div>
        <div className="grid gap-4 border-t border-slate-200 px-6 py-4 lg:grid-cols-2">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Daily collection</h3>
            {dailyCollectionRows.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">No collection records in selected period.</p>
            ) : (
              <div className="mt-2 overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-xs sm:text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase text-slate-500">Date</th>
                      <th className="px-3 py-2 text-right text-xs font-medium uppercase text-slate-500">Submitted</th>
                      <th className="px-3 py-2 text-right text-xs font-medium uppercase text-slate-500">Verified</th>
                      <th className="px-3 py-2 text-right text-xs font-medium uppercase text-slate-500">Pending</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {dailyCollectionRows.map((row) => (
                      <tr key={row.date}>
                        <td className="px-3 py-2 text-slate-700">{row.date}</td>
                        <td className="px-3 py-2 text-right text-indigo-700">INR {row.submitted.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right text-emerald-700">INR {row.verified.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right text-amber-700">INR {row.pending.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Payment type summary</h3>
            {methodRows.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">No payment-method data in selected period.</p>
            ) : (
              <div className="mt-2 overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-xs sm:text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase text-slate-500">Method</th>
                      <th className="px-3 py-2 text-right text-xs font-medium uppercase text-slate-500">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {methodRows.map(([method, amount]) => (
                      <tr key={method}>
                        <td className="px-3 py-2 text-slate-700 capitalize">{method}</td>
                        <td className="px-3 py-2 text-right text-slate-900">INR {amount.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
        <div className="border-t border-slate-200 px-6 py-4">
          <details>
            <summary className="cursor-pointer text-sm font-semibold text-primary-700">
              View detailed transactions (with payment type)
            </summary>
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-xs sm:text-sm whitespace-nowrap">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase text-slate-500">Date</th>
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase text-slate-500">Payer Type</th>
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase text-slate-500">Method</th>
                    <th className="px-3 py-2 text-right text-xs font-medium uppercase text-slate-500">Amount</th>
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase text-slate-500">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {collectionPayments.map((row) => (
                    <tr key={row.id}>
                      <td className="px-3 py-2 text-slate-700">{new Date(row.paidAt).toLocaleDateString()}</td>
                      <td className="px-3 py-2 text-slate-700 capitalize">{row.payerType}</td>
                      <td className="px-3 py-2 text-slate-700 capitalize">{row.method}</td>
                      <td className="px-3 py-2 text-right text-slate-900">INR {row.amount.toFixed(2)}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            row.verifiedAt ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {row.verifiedAt ? "Verified" : "Pending"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </div>
      </div>
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
