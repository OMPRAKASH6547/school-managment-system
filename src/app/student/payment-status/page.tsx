export default async function StudentPaymentStatusPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const status = typeof sp.status === "string" ? sp.status : "error";
  const txnid = typeof sp.txnid === "string" ? sp.txnid : "";
  const ok = status === "success";

  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className={`text-2xl font-bold ${ok ? "text-emerald-600" : "text-amber-600"}`}>
          {ok ? "Payment successful" : "Payment not completed"}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          {ok
            ? "Your payment was received and fee status has been updated."
            : "Please try again or contact your school admin."}
        </p>
        {txnid ? <p className="mt-3 text-xs text-slate-500">Transaction ID: {txnid}</p> : null}
        <div className="mt-6">
          <a className="btn-primary" href="/student">
            Go to student dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
