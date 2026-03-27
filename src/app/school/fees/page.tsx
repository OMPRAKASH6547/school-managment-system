import { getSession, getResolvedBranchIdForSchool } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { RecordPaymentForm } from "@/app/components/RecordPaymentForm";
import { CreateFeePlanForm } from "@/app/components/CreateFeePlanForm";
import { FeeReceiptDownload } from "@/app/components/FeeReceiptDownload";
import { DeleteRowButton } from "@/app/components/DeleteRowButton";
import { redirect } from "next/navigation";

const PAGE_SIZE = 10;

export default async function SchoolFeesPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const session = await getSession();
  if (session?.role === "teacher") redirect("/school/teacher");
  if (session?.role === "staff") redirect("/school/staff-attendance");
  const orgId = session?.organizationId!;
  const branchId = await getResolvedBranchIdForSchool(session);
  const rawTab = typeof searchParams?.tab === "string" ? searchParams.tab : "student";
  const tab: "student" | "staff" = rawTab === "staff" ? "staff" : "student";
  const q = typeof searchParams?.q === "string" ? searchParams.q.trim() : "";
  const rollNo = typeof searchParams?.rollNo === "string" ? searchParams.rollNo.trim() : "";
  const status = typeof searchParams?.status === "string" ? searchParams.status : "";
  const method = typeof searchParams?.method === "string" ? searchParams.method : "";
  const payerType = typeof searchParams?.payerType === "string" ? searchParams.payerType : "";
  const collectorStaffId = typeof searchParams?.collectorStaffId === "string" ? searchParams.collectorStaffId : "";
  const month = typeof searchParams?.month === "string" ? searchParams.month : "";
  const year = typeof searchParams?.year === "string" ? searchParams.year : "";
  const from = typeof searchParams?.from === "string" ? searchParams.from : "";
  const to = typeof searchParams?.to === "string" ? searchParams.to : "";
  const page = Math.max(1, Number(typeof searchParams?.page === "string" ? searchParams.page : "1") || 1);
  const skip = (page - 1) * PAGE_SIZE;

  const periodWhere =
    month
      ? {
          paidAt: {
            gte: new Date(`${month}-01T00:00:00.000Z`),
            lt: new Date(new Date(`${month}-01T00:00:00.000Z`).setUTCMonth(new Date(`${month}-01T00:00:00.000Z`).getUTCMonth() + 1)),
          },
        }
      : year
      ? {
          paidAt: {
            gte: new Date(`${year}-01-01T00:00:00.000Z`),
            lt: new Date(`${Number(year) + 1}-01-01T00:00:00.000Z`),
          },
        }
      : from || to
      ? {
          paidAt: {
            ...(from ? { gte: new Date(`${from}T00:00:00.000Z`) } : {}),
            ...(to ? { lt: new Date(`${to}T23:59:59.999Z`) } : {}),
          },
        }
      : {};

  const paymentWhere: any = {
    organizationId: orgId,
    branchId,
    ...(method ? { method } : {}),
    ...(status === "pending"
      ? { verifiedAt: null }
      : status === "verified"
      ? { verifiedAt: { not: null } }
      : {}),
    ...(payerType ? { payerType } : { payerType: tab }),
    ...(collectorStaffId ? { collectedByStaffId: collectorStaffId } : {}),
    ...periodWhere,
    ...(q
      ? {
          OR: [
            {
              student: {
                OR: [
                  { firstName: { contains: q } },
                  { lastName: { contains: q } },
                  { rollNo: { contains: q } },
                ],
              },
            },
            {
              staff: {
                OR: [{ firstName: { contains: q } }, { lastName: { contains: q } }, { employeeId: { contains: q } }],
              },
            },
          ],
        }
      : {}),
    ...(rollNo
      ? {
          student: {
            ...(q
              ? {
                  OR: [
                    { firstName: { contains: q } },
                    { lastName: { contains: q } },
                    { rollNo: { contains: q } },
                  ],
                }
              : {}),
            rollNo: { contains: rollNo },
          },
        }
      : {}),
  };

  const [feePlans, recentPayments, paymentsTotal, students, staff, classes] = await Promise.all([
    prisma.feePlan.findMany({
      where: { organizationId: orgId, branchId, isActive: true },
      orderBy: { name: "asc" },
    }),
    prisma.payment.findMany({
      where: paymentWhere,
      orderBy: { paidAt: "desc" },
      skip,
      take: PAGE_SIZE,
      include: { student: true, staff: true, collectedBy: true },
    }),
    prisma.payment.count({ where: paymentWhere }),
    prisma.student.findMany({
      where: { organizationId: orgId, branchId, status: "active" },
      select: { id: true, firstName: true, lastName: true, rollNo: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
    prisma.staff.findMany({
      where: { organizationId: orgId, branchId, status: "active" },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: { id: true, firstName: true, lastName: true, role: true, salary: true, employeeId: true },
    }),
    prisma.class.findMany({
      where: { organizationId: orgId, branchId, status: "active" },
      orderBy: { name: "asc" },
    }),
  ]);
  const tabPlans = feePlans.filter((p) => (p as any).payerType ? (p as any).payerType === tab : tab === "student");
  const totalPages = Math.max(1, Math.ceil(paymentsTotal / PAGE_SIZE));
  const buildPageHref = (nextPage: number) => {
    const params = new URLSearchParams();
    params.set("tab", tab);
    if (q) params.set("q", q);
    if (rollNo) params.set("rollNo", rollNo);
    if (status) params.set("status", status);
    if (method) params.set("method", method);
    if (payerType) params.set("payerType", payerType);
    if (collectorStaffId) params.set("collectorStaffId", collectorStaffId);
    if (month) params.set("month", month);
    if (year) params.set("year", year);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    params.set("page", String(nextPage));
    return `/school/fees?${params.toString()}`;
  };

  return (
    <>
      <h1 className="text-2xl font-bold text-primary-600">Fee management</h1>
      <p className="mt-1 text-slate-600">Record student/staff payments, track collector-wise totals, and download QR invoices.</p>
      <div className="mt-4 inline-flex overflow-hidden rounded-lg border border-slate-200 bg-white">
        <a
          href="/school/fees?tab=student"
          className={`px-4 py-2 text-sm font-medium ${tab === "student" ? "bg-primary-600 text-white" : "text-slate-700 hover:bg-slate-50"}`}
        >
          Student Payments
        </a>
        <a
          href="/school/fees?tab=staff"
          className={`px-4 py-2 text-sm font-medium ${tab === "staff" ? "bg-primary-600 text-white" : "text-slate-700 hover:bg-slate-50"}`}
        >
          Staff Salary Payments
        </a>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="card">
          <h2 className="text-lg font-semibold text-slate-900">Fee plans</h2>
          <CreateFeePlanForm classes={classes} organizationId={orgId} initialPayerType={tab} />
          {tabPlans.length === 0 ? (
            <p className="mt-4 text-slate-500">No fee plans yet. Create one above.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {tabPlans.map((p) => (
                <li key={p.id} className="flex justify-between text-sm">
                  <span>{p.name}</span>
                  <span>
                    ₹{p.amount} ({p.frequency})
                    <DeleteRowButton apiPath={`/api/school/fee-plans/${p.id}`} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-slate-900">
            Record {tab === "student" ? "student" : "staff salary"} payment
          </h2>
          <RecordPaymentForm
            feePlans={tabPlans}
            students={students}
            staff={staff}
            organizationId={orgId}
            initialPayerType={tab}
          />
        </div>
      </div>

      <div className="mt-8 card overflow-hidden p-0">
        <h2 className="px-6 py-4 text-lg font-semibold text-slate-900">
          Recent {tab === "student" ? "student" : "staff salary"} payments
        </h2>
        {recentPayments.length === 0 ? (
          <div className="px-6 pb-6 text-slate-500">No payments yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-xs sm:text-sm whitespace-nowrap">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Payer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Roll No</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Method</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Collected by</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {recentPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {p.payerType === "staff"
                        ? `${p.staff?.firstName ?? ""} ${p.staff?.lastName ?? ""}`.trim() || "—"
                        : `${p.student?.firstName ?? ""} ${p.student?.lastName ?? ""}`.trim() || "—"}
                    </td>
                    <td className="px-6 py-4 text-slate-600">{p.student?.rollNo ?? "—"}</td>
                    <td className="px-6 py-4 text-slate-600 capitalize">{p.payerType}</td>
                    <td className="px-6 py-4 text-slate-600">₹{p.amount}</td>
                    <td className="px-6 py-4 text-slate-600">{new Date(p.paidAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-slate-600">{p.method}</td>
                    <td className="px-6 py-4 text-slate-600">
                      {p.collectedBy ? `${p.collectedBy.firstName} ${p.collectedBy.lastName}` : "—"}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${p.verifiedAt ? "bg-school-green/20 text-green-800" : "bg-amber-100 text-amber-800"}`}>
                        {p.verifiedAt ? "Verified" : "Pending"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <FeeReceiptDownload paymentId={p.id} isVerified={!!p.verifiedAt} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
        <span>
          Page {page} of {totalPages} ({paymentsTotal} records)
        </span>
        <div className="flex gap-2">
          {page > 1 && (
            <a className="btn-secondary" href={buildPageHref(page - 1)}>
              Previous
            </a>
          )}
          {page < totalPages && (
            <a className="btn-secondary" href={buildPageHref(page + 1)}>
              Next
            </a>
          )}
        </div>
      </div>
    </>
  );
}
