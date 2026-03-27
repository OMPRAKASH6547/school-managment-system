import Link from "next/link";
import { prisma } from "@/lib/db";

type SearchParams = {
  paymentId?: string | string[];
};

export default async function PaymentVerifyPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const raw = searchParams.paymentId;
  const paymentId = Array.isArray(raw) ? raw[0] : raw;

  if (!paymentId) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-2xl font-bold text-slate-900">Payment Verification</h1>
          <p className="mt-2 text-sm text-slate-600">
            Scan the QR on the fee receipt to view payment details.
          </p>
          <div className="mt-6">
            <Link href="/" className="text-sm font-medium text-primary-600 hover:underline">
              Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const payment = await prisma.payment.findFirst({
    where: { id: paymentId },
    select: {
      id: true,
      payerType: true,
      status: true,
      paidAt: true,
      amount: true,
      method: true,
      reference: true,
      verifiedAt: true,
      verifiedBy: true,
      verifiedByName: true,
      student: { select: { firstName: true, lastName: true, rollNo: true } },
      staff: { select: { firstName: true, lastName: true, employeeId: true } },
      collectedBy: { select: { firstName: true, lastName: true } },
      organization: { select: { name: true, schoolCode: true } },
    },
  });

  if (!payment || (!payment.student && !payment.staff)) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-2xl font-bold text-slate-900">Payment Verification</h1>
          <p className="mt-2 text-sm text-slate-600">No payment found for this QR.</p>
          <div className="mt-6">
            <Link href="/" className="text-sm font-medium text-primary-600 hover:underline">
              Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  let acceptedBy: string | null = payment.verifiedByName ?? null;
  if (!acceptedBy && payment.verifiedBy) {
    const user = await prisma.user.findFirst({
      where: { id: payment.verifiedBy },
      select: { name: true },
    });
    acceptedBy = user?.name ?? null;
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Payment Verification</h1>
          <p className="mt-2 text-sm text-slate-600">
            {payment.organization?.name ?? "School"}
          </p>
        </div>

        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-lg font-semibold text-slate-900">
                {payment.payerType === "staff"
                  ? `${payment.staff?.firstName ?? ""} ${payment.staff?.lastName ?? ""}`.trim()
                  : `${payment.student?.firstName ?? ""} ${payment.student?.lastName ?? ""}`.trim()}
              </div>
              <div className="mt-1 text-sm text-slate-600">
                {payment.payerType === "staff"
                  ? `Employee ID: ${payment.staff?.employeeId ?? "—"}`
                  : `Roll No: ${payment.student?.rollNo ?? "—"}`}
              </div>
            </div>
            <div>
              {payment.status === "verified" ? (
                <span className="rounded-full bg-school-green/20 px-3 py-1 text-xs font-medium text-green-800">
                  Verified
                </span>
              ) : (
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
                  Pending Verification
                </span>
              )}
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div>
              <div className="text-xs text-slate-500">Payment Date</div>
              <div className="text-sm font-medium text-slate-900">
                {new Date(payment.paidAt).toLocaleDateString()}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Amount</div>
              <div className="text-sm font-medium text-slate-900">₹{payment.amount}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Method</div>
              <div className="text-sm font-medium text-slate-900">{payment.method}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Reference</div>
              <div className="text-sm font-medium text-slate-900">{payment.reference ?? "—"}</div>
            </div>
            <div className="sm:col-span-2">
              <div className="text-xs text-slate-500">Accepted By</div>
              <div className="text-sm font-medium text-slate-900">
                {acceptedBy ?? (payment.status === "verified" ? "—" : "Not verified yet")}
              </div>
            </div>
            <div className="sm:col-span-2">
              <div className="text-xs text-slate-500">Collected By</div>
              <div className="text-sm font-medium text-slate-900">
                {payment.collectedBy ? `${payment.collectedBy.firstName} ${payment.collectedBy.lastName}` : "—"}
              </div>
            </div>
          </div>

          {payment.verifiedAt ? (
            <div className="mt-4 text-xs text-slate-500">
              Verified at: {new Date(payment.verifiedAt).toLocaleString()}
            </div>
          ) : null}
        </div>

        <div className="mt-6">
          <Link href="/" className="text-sm font-medium text-primary-600 hover:underline">
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}

