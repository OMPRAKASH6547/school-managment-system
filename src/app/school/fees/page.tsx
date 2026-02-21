import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { RecordPaymentForm } from "@/app/components/RecordPaymentForm";
import { CreateFeePlanForm } from "@/app/components/CreateFeePlanForm";
import { FeeReceiptDownload } from "@/app/components/FeeReceiptDownload";
import { VerifyPaymentButton } from "@/app/components/VerifyPaymentButton";

export default async function SchoolFeesPage() {
  const session = await getSession();
  const orgId = session?.organizationId!;
  const [feePlans, recentPayments, students, classes] = await Promise.all([
    prisma.feePlan.findMany({
      where: { organizationId: orgId, isActive: true },
      orderBy: { name: "asc" },
    }),
    prisma.payment.findMany({
      where: { organizationId: orgId },
      orderBy: { paidAt: "desc" },
      take: 20,
      include: { student: true },
    }),
    prisma.student.findMany({
      where: { organizationId: orgId, status: "active" },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
    prisma.class.findMany({
      where: { organizationId: orgId, status: "active" },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <>
      <h1 className="text-2xl font-bold text-primary-600">Fee management</h1>
      <p className="mt-1 text-slate-600">Record payments and download fee receipts (PDF with school logo).</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="card">
          <h2 className="text-lg font-semibold text-slate-900">Fee plans</h2>
          <CreateFeePlanForm classes={classes} organizationId={orgId} />
          {feePlans.length === 0 ? (
            <p className="mt-4 text-slate-500">No fee plans yet. Create one above.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {feePlans.map((p) => (
                <li key={p.id} className="flex justify-between text-sm">
                  <span>{p.name}</span>
                  <span>₹{p.amount} ({p.frequency})</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-slate-900">Record payment</h2>
          <RecordPaymentForm feePlans={feePlans} students={students} organizationId={orgId} />
        </div>
      </div>

      <div className="mt-8 card overflow-hidden p-0">
        <h2 className="px-6 py-4 text-lg font-semibold text-slate-900">Recent payments</h2>
        {recentPayments.length === 0 ? (
          <div className="px-6 pb-6 text-slate-500">No payments yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Student</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Method</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {recentPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {p.student?.firstName} {p.student?.lastName}
                    </td>
                    <td className="px-6 py-4 text-slate-600">₹{p.amount}</td>
                    <td className="px-6 py-4 text-slate-600">{new Date(p.paidAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-slate-600">{p.method}</td>
                    <td className="px-6 py-4">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${p.verifiedAt ? "bg-school-green/20 text-green-800" : "bg-amber-100 text-amber-800"}`}>
                        {p.verifiedAt ? "Verified" : "Pending"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <FeeReceiptDownload paymentId={p.id} isVerified={!!p.verifiedAt} />
                      {!p.verifiedAt && (
                        <VerifyPaymentButton paymentId={p.id} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
