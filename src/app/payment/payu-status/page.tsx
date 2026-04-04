import Link from "next/link";

type SearchParams = {
  status?: string | string[];
  txnid?: string | string[];
};

function getSingle(v: string | string[] | undefined): string {
  return Array.isArray(v) ? (v[0] ?? "") : (v ?? "");
}

export default function PayuStatusPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const status = getSingle(searchParams?.status).toLowerCase();
  const txnid = getSingle(searchParams?.txnid);
  const isSuccess = status === "success";
  const isFailed = status === "failed" || status === "failure";

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-12">
      <div className="mx-auto max-w-xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Payment Status</h1>
        {isSuccess ? (
          <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-emerald-800">
            Payment successful. Your request has been recorded.
          </p>
        ) : isFailed ? (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-amber-800">
            Payment failed or was cancelled. Please try again.
          </p>
        ) : (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-red-800">
            We could not verify payment callback. Please contact support if amount was deducted.
          </p>
        )}
        {txnid ? (
          <p className="mt-3 text-sm text-slate-600">
            Transaction ID: <span className="font-medium text-slate-900">{txnid}</span>
          </p>
        ) : null}
        <div className="mt-6 flex flex-wrap gap-2">
          <Link href="/" className="btn-primary">
            Home
          </Link>
          <Link href="/register" className="btn-secondary">
            Register Institute
          </Link>
          <Link href="/login" className="btn-secondary">
            Login
          </Link>
        </div>
      </div>
    </div>
  );
}
