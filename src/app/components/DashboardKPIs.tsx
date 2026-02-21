"use client";

function formatMoney(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "decimal",
    maximumFractionDigits: 0,
  }).format(n);
}

export function DashboardKPIs({
  total,
  boys,
  girls,
  active,
  left,
  totalFee,
  collected,
  pending,
  itemsSold,
  revenue,
}: {
  total: number;
  boys: number;
  girls: number;
  active: number;
  left: number;
  totalFee: number;
  collected: number;
  pending: number;
  itemsSold: number;
  revenue: number;
}) {
  return (
    <>
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {[
          { label: "Total", value: total, color: "text-school-navy" },
          { label: "Boys", value: boys, color: "text-school-navy" },
          { label: "Girls", value: girls, color: "text-school-navy" },
          { label: "Active", value: active, color: "text-school-navy" },
          { label: "Left", value: left, color: "text-school-navy" },
        ].map((k) => (
          <div key={k.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-2xl font-bold text-school-navy">{k.value}</p>
            <p className="text-sm text-slate-500">{k.label}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-lg font-bold text-school-navy">₹{formatMoney(totalFee)}</p>
          <p className="text-sm text-slate-500">Total Fee</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-lg font-bold text-school-green">₹{formatMoney(collected)}</p>
          <p className="text-sm text-slate-500">Collected</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-lg font-bold text-primary-600">₹{formatMoney(pending)}</p>
          <p className="text-sm text-slate-500">Pending</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-lg font-bold text-school-navy">{itemsSold}</p>
          <p className="text-sm text-slate-500">Items Sold</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-lg font-bold text-primary-600">₹{formatMoney(revenue)}</p>
          <p className="text-sm text-slate-500">Revenue</p>
        </div>
      </div>
    </>
  );
}
