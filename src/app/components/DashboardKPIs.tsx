"use client";

function formatMoney(n: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "decimal",
    maximumFractionDigits: 0,
  }).format(n);
}

interface DashboardKPIsProps {
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
  expenses: number;
  profitLoss: number;
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
  expenses,
  profitLoss,
}: DashboardKPIsProps) {
  const kpis = [
    { label: "Total Students", value: total, color: "text-school-navy" },
    { label: "Boys", value: boys, color: "text-school-navy" },
    { label: "Girls", value: girls, color: "text-school-navy" },
    { label: "Active", value: active, color: "text-school-navy" },
    { label: "Left", value: left, color: "text-school-navy" },
  ];

  return (
    <>
      {/* Fee & revenue first (matches dashboard: payment-related blocks above student counts) */}
      <div className="grid grid-cols-1 gap-3 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        <div className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4 shadow-sm flex flex-col items-center">
          <p className="text-base sm:text-lg font-bold text-school-navy">
            {formatMoney(totalFee)}
          </p>
          <p className="text-xs sm:text-sm text-slate-500">Total Fee</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4 shadow-sm flex flex-col items-center">
          <p className="text-base sm:text-lg font-bold text-school-green">
            {formatMoney(collected)}
          </p>
          <p className="text-xs sm:text-sm text-slate-500">Collected</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4 shadow-sm flex flex-col items-center">
          <p className="text-base sm:text-lg font-bold text-primary-600">
            {formatMoney(pending)}
          </p>
          <p className="text-xs sm:text-sm text-slate-500">Pending</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4 shadow-sm flex flex-col items-center">
          <p className="text-base sm:text-lg font-bold text-school-navy">
            {itemsSold}
          </p>
          <p className="text-xs sm:text-sm text-slate-500">Items Sold</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4 shadow-sm flex flex-col items-center">
          <p className="text-base sm:text-lg font-bold text-primary-600">
            {formatMoney(revenue)}
          </p>
          <p className="text-xs sm:text-sm text-slate-500">Revenue</p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 xs:grid-cols-2 lg:grid-cols-2">
        <div className="rounded-xl border border-rose-100 bg-rose-50 p-3 sm:p-4 shadow-sm flex flex-col items-center">
          <p className="text-base sm:text-lg font-bold text-rose-800">{formatMoney(expenses)}</p>
          <p className="text-xs sm:text-sm text-rose-700">Expenses</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4 shadow-sm flex flex-col items-center">
          <p className={`text-base sm:text-lg font-bold ${profitLoss >= 0 ? "text-emerald-700" : "text-red-700"}`}>
            {profitLoss >= 0 ? "+" : ""}{formatMoney(profitLoss)}
          </p>
          <p className="text-xs sm:text-sm text-slate-500">Profit / Loss</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {kpis.map((k) => (
          <div
            key={k.label}
            className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4 shadow-sm flex flex-col items-center"
          >
            <p className={`text-xl sm:text-2xl font-bold ${k.color}`}>
              {k.value}
            </p>
            <p className="text-xs sm:text-sm text-slate-500">{k.label}</p>
          </div>
        ))}
      </div>
    </>
  );
}