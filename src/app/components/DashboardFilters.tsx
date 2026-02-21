"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function DashboardFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const month = searchParams.get("month") ?? new Date().toISOString().slice(0, 7);

  function updateFilter(key: string, value: string) {
    const p = new URLSearchParams(searchParams.toString());
    if (value) p.set(key, value);
    else p.delete(key);
    router.push(`/school?${p.toString()}`);
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <select
        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm"
        defaultValue=""
        onChange={(e) => updateFilter("class", e.target.value)}
      >
        <option value="">All Classes</option>
      </select>
      <select
        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm"
        defaultValue=""
        onChange={(e) => updateFilter("section", e.target.value)}
      >
        <option value="">All Sections</option>
      </select>
      <select
        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm"
        defaultValue=""
        onChange={(e) => updateFilter("gender", e.target.value)}
      >
        <option value="">All Gender</option>
        <option value="male">Male</option>
        <option value="female">Female</option>
      </select>
      <select
        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm"
        defaultValue=""
        onChange={(e) => updateFilter("status", e.target.value)}
      >
        <option value="">All Status</option>
        <option value="active">Active</option>
        <option value="left">Left</option>
      </select>
      <input
        type="month"
        value={month}
        onChange={(e) => updateFilter("month", e.target.value)}
        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm"
      />
    </div>
  );
}
