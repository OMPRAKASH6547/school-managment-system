import { getSession, getResolvedBranchIdForSchool } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { VerifyPaymentButton } from "@/app/components/VerifyPaymentButton";
import { RejectPaymentButton } from "@/app/components/RejectPaymentButton";
import { PaymentVerificationFilterForm } from "@/app/components/PaymentVerificationFilterForm";

const PAGE_SIZE = 20;

export default async function PaymentVerificationPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const session = await getSession();
  if (session?.role === "teacher") redirect("/school/teacher");
  if (session?.role === "staff") redirect("/school/staff-attendance");
  const orgId = session?.organizationId!;
  const branchId = await getResolvedBranchIdForSchool(session);

  const q = typeof searchParams?.q === "string" ? searchParams.q.trim() : "";
  const payerType = typeof searchParams?.payerType === "string" ? searchParams.payerType : "";
  const status = typeof searchParams?.status === "string" ? searchParams.status : "";
  const page = Math.max(1, Number(typeof searchParams?.page === "string" ? searchParams.page : "1") || 1);
  const skip = (page - 1) * PAGE_SIZE;

  const where: any = {
    organizationId: orgId,
    branchId,
    ...(payerType ? { payerType } : {}),
    ...(status === "pending"
      ? { verifiedAt: null, status: { not: "rejected" } }
      : status === "verified"
      ? { verifiedAt: { not: null } }
      : status === "rejected"
      ? { status: "rejected" }
      : {}),
    ...(q
      ? {
          OR: [
            {
              student: {
                OR: [{ firstName: { contains: q } }, { lastName: { contains: q } }, { rollNo: { contains: q } }],
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
  };

  const [payments, total, bookSales] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: { student: true, staff: true, collectedBy: true },
      orderBy: { paidAt: "desc" },
      skip,
      take: PAGE_SIZE,
    }),
    prisma.payment.count({ where }),
    prisma.bookSale.findMany({
      where: {
        organizationId: orgId,
        branchId,
        ...(q
          ? {
              OR: [
                { invoiceNo: { contains: q } },
                { customerName: { contains: q } },
                { student: { firstName: { contains: q } } },
                { student: { lastName: { contains: q } } },
              ],
            }
          : {}),
      },
      include: { student: true, bookSet: true },
      orderBy: { soldAt: "desc" },
      take: 20,
    }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const buildPageHref = (nextPage: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (payerType) params.set("payerType", payerType);
    if (status) params.set("status", status);
    params.set("page", String(nextPage));
    return `/school/payment-verification?${params.toString()}`;
  };

  return (
    <>
      <h1 className="text-2xl font-bold text-primary-600">Payment verification</h1>
      <p className="mt-1 text-slate-600">Admin can verify or reject submitted student/staff payments from one place.</p>

      <div className="mt-6 card overflow-hidden p-0">
        <PaymentVerificationFilterForm q={q} payerType={payerType} status={status} />

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-xs sm:text-sm whitespace-nowrap">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Payer</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Fee month</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Method</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Collected by</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Verified by</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium text-slate-900">
                    {p.payerType === "staff"
                      ? `${p.staff?.firstName ?? ""} ${p.staff?.lastName ?? ""}`.trim() || "—"
                      : `${p.student?.firstName ?? ""} ${p.student?.lastName ?? ""}`.trim() || "—"}
                  </td>
                  <td className="px-6 py-4 text-slate-600 capitalize">{p.payerType}</td>
                  <td className="px-6 py-4 text-slate-600">₹{p.amount}</td>
                  <td className="px-6 py-4 text-slate-600">{(p as { feePeriodMonth?: string | null }).feePeriodMonth ?? "—"}</td>
                  <td className="px-6 py-4 text-slate-600">{new Date(p.paidAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-slate-600">{p.method}</td>
                  <td className="px-6 py-4 text-slate-600">
                    {p.collectedBy ? `${p.collectedBy.firstName} ${p.collectedBy.lastName}` : "—"}
                  </td>
                  <td className="px-6 py-4 text-slate-600">{p.verifiedByName ?? "—"}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        p.status === "rejected"
                          ? "bg-red-100 text-red-700"
                          : p.verifiedAt
                          ? "bg-school-green/20 text-green-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {p.status === "rejected" ? "Rejected" : p.verifiedAt ? "Verified" : "Pending"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {!p.verifiedAt && p.status !== "rejected" && <VerifyPaymentButton paymentId={p.id} />}
                    {!p.verifiedAt && p.status !== "rejected" && <RejectPaymentButton paymentId={p.id} />}
                    {p.verifiedAt && (
                      <span className="text-xs text-slate-500">Download from Students table</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="mt-8 card overflow-hidden p-0">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-school-navy">Book invoices</h2>
          <p className="text-xs text-slate-500">All book sale invoices in one place.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-xs sm:text-sm whitespace-nowrap">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Invoice</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Customer / Student</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Set</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Amount</th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase text-slate-500">Invoice PDF</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {bookSales.map((sale) => (
                <tr key={sale.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 text-slate-900 font-medium">{sale.invoiceNo ?? sale.id.slice(0, 8)}</td>
                  <td className="px-6 py-4 text-slate-600">
                    {sale.customerName || `${sale.student?.firstName ?? ""} ${sale.student?.lastName ?? ""}`.trim() || "—"}
                  </td>
                  <td className="px-6 py-4 text-slate-600">{sale.bookSet?.name ?? "—"}</td>
                  <td className="px-6 py-4 text-slate-600">{new Date(sale.soldAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-slate-600">₹{sale.totalAmount}</td>
                  <td className="px-6 py-4 text-right">
                    <a
                      href={`/api/pdf/book-invoice/${sale.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-school-green hover:underline text-sm"
                    >
                      Download PDF
                    </a>
                  </td>
                </tr>
              ))}
              {bookSales.length === 0 ? (
                <tr>
                  <td className="px-6 py-5 text-slate-500" colSpan={6}>
                    No book invoices found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
        <span>
          Page {page} of {totalPages} ({total} records)
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
