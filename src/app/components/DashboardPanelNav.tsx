"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

const PANELS: { id: string; label: string }[] = [
  { id: "all", label: "All" },
  { id: "kpis", label: "KPIs" },
  { id: "attendance", label: "Attendance" },
  { id: "charts", label: "Charts" },
  { id: "collections", label: "Collections" },
  { id: "sessions", label: "Class sessions" },
  { id: "pending", label: "Pending payments" },
];

export function DashboardPanelNav({ isCoaching = false }: { isCoaching?: boolean }) {
  const sp = useSearchParams();
  const raw = sp.get("panel");
  const current = raw && PANELS.some((p) => p.id === raw) ? raw : "all";
  const labelsById = isCoaching
    ? {
        sessions: "Daily Class Tracking",
        pending: "Fee Reminders",
      }
    : {};

  function href(panelId: string) {
    const p = new URLSearchParams(sp.toString());
    if (panelId === "all") {
      p.delete("panel");
    } else {
      p.set("panel", panelId);
    }
    const q = p.toString();
    return q ? `/school?${q}` : "/school";
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/80 p-2 sm:p-3">
      <span className="w-full text-xs font-semibold uppercase tracking-wide text-slate-500 sm:w-auto sm:pr-2">
        View
      </span>
      <div className="flex flex-wrap gap-2">
        {PANELS.map(({ id, label }) => {
          const active = id === current;
          const viewLabel = labelsById[id as keyof typeof labelsById] ?? label;
          return (
            <Link
              key={id}
              href={href(id)}
              scroll={false}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors sm:text-sm ${
                active
                  ? "bg-primary-600 text-white shadow-sm"
                  : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
              }`}
            >
              {viewLabel}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
