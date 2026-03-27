import { getSession, getResolvedBranchIdForSchool } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { StaffAttendanceForm } from "@/app/components/StaffAttendanceForm";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function StaffAttendancePage() {
  const session = await getSession();
  if (session?.role === "teacher") redirect("/school/teacher");
  if (session?.role === "student") redirect("/school");
  const orgId = session?.organizationId!;
  const branchId = await getResolvedBranchIdForSchool(session);
  const staff = await prisma.staff.findMany({
    where: { organizationId: orgId, branchId, status: "active" },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
  const me = session?.email
    ? await prisma.staff.findFirst({
        where: { organizationId: orgId, branchId, email: session.email },
        select: { id: true, salary: true, firstName: true, lastName: true },
      })
    : null;
  const myPayments = me
    ? await prisma.payment.findMany({
        where: {
          organizationId: orgId,
          branchId,
          staffId: me.id,
          paidAt: {
            gte: new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1, 0, 0, 0)),
            lt: new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() + 1, 1, 0, 0, 0)),
          },
        },
        orderBy: { paidAt: "desc" },
        take: 20,
      })
    : [];
  const paidTotal = myPayments.filter((p) => p.verifiedAt).reduce((s, p) => s + p.amount, 0);
  const monthlySalary = me?.salary ?? 0;
  const remaining = Math.max(0, monthlySalary - paidTotal);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Link href="/school" className="btn-secondary">School Dashboard</Link>
        <Link href="/school/fees?payerType=staff" className="btn-secondary">Fee Dashboard</Link>
      </div>
      <h1 className="text-2xl font-bold text-primary-600">Staff attendance</h1>
      <p className="mt-1 text-slate-600">Mark daily attendance for teachers and staff.</p>
      {me && (
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-5 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-blue-700">Monthly Salary</p>
            <p className="mt-2 text-2xl font-bold text-blue-900">₹{monthlySalary.toFixed(2)}</p>
          </div>
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-5 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-emerald-700">Collected Salary</p>
            <p className="mt-2 text-2xl font-bold text-emerald-900">₹{paidTotal.toFixed(2)}</p>
          </div>
          <div className="rounded-xl border border-amber-100 bg-amber-50 p-5 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-amber-700">Remaining Salary</p>
            <p className="mt-2 text-2xl font-bold text-amber-900">₹{remaining.toFixed(2)}</p>
          </div>
        </div>
      )}
      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <StaffAttendanceForm staff={staff} defaultDate={today} />
      </div>
      {me && (
        <>
        <div className="mt-6 card overflow-hidden p-0">
          <div className="px-6 py-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Payment details - {me.firstName} {me.lastName}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Monthly paid: ₹{paidTotal.toFixed(2)} | Remaining: ₹{remaining.toFixed(2)}
            </p>
          </div>
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
                {myPayments.map((p) => (
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
      )}
    </>
  );
}
