"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export function TeacherClassTrackingControls({
  classes,
  activeClassIds,
  activeSessionStartedAt = null,
  completedTodayClassIds = [],
}: {
  classes: { id: string; name: string; subjectLabel?: string | null }[];
  activeClassIds: string[];
  activeSessionStartedAt?: string | null;
  /** Classes already ended today — cannot start again until the next calendar day */
  completedTodayClassIds?: string[];
}) {
  const router = useRouter();
  const serverActiveKey = useMemo(() => [...activeClassIds].sort().join("|"), [activeClassIds]);
  const [pendingActiveClassId, setPendingActiveClassId] = useState<string | null>(null);

  useEffect(() => {
    if (pendingActiveClassId && activeClassIds.includes(pendingActiveClassId)) {
      setPendingActiveClassId(null);
    }
  }, [serverActiveKey, pendingActiveClassId, activeClassIds]);

  const effectiveActiveIds = useMemo(() => {
    if (pendingActiveClassId && !activeClassIds.includes(pendingActiveClassId)) {
      return [...activeClassIds, pendingActiveClassId];
    }
    return activeClassIds;
  }, [activeClassIds, pendingActiveClassId]);

  const activeSet = new Set(effectiveActiveIds);
  const completedTodaySet = new Set(completedTodayClassIds);
  const activeClassId = effectiveActiveIds[0] ?? null;
  const activeClassName = activeClassId
    ? classes.find((c) => c.id === activeClassId)?.name ?? "Active class"
    : null;
  const [loadingClassId, setLoadingClassId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [autoMarkAttendance, setAutoMarkAttendance] = useState(true);

  async function start(classId: string) {
    setError(null);
    setLoadingClassId(classId);
    try {
      const res = await fetch("/api/school/teacher-class-sessions/start", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId, autoMarkAttendance }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Start failed");
        return;
      }
      setPendingActiveClassId(classId);
      await router.refresh();
    } catch {
      setError("Start failed");
    } finally {
      setLoadingClassId(null);
    }
  }

  async function end(classId: string) {
    setError(null);
    setLoadingClassId(classId);
    try {
      const res = await fetch("/api/school/teacher-class-sessions/end", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "End failed");
        return;
      }
      setPendingActiveClassId(null);
      await router.refresh();
    } catch {
      setError("End failed");
    } finally {
      setLoadingClassId(null);
    }
  }

  if (!classes.length) return <div className="text-sm text-slate-500">No assigned classes.</div>;

  return (
    <div className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm p-4">
      {error && <div className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-slate-900">Daily class tracking</h2>
        <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
          <input
            type="checkbox"
            checked={autoMarkAttendance}
            onChange={(e) => setAutoMarkAttendance(e.target.checked)}
          />
          Auto-mark attendance on class start
        </label>
      </div>
      {activeClassId ? (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          <div className="space-y-0.5">
            <p>
              <span className="font-medium">Live Class:</span> <span className="font-medium">{activeClassName}</span>
            </p>
            {activeSessionStartedAt ? (
              <p className="text-xs text-emerald-700">
                Started at {new Date(activeSessionStartedAt).toLocaleTimeString()}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => end(activeClassId)}
            disabled={loadingClassId === activeClassId}
            className="rounded-lg bg-school-green px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {loadingClassId === activeClassId ? "Ending..." : "End Class"}
          </button>
        </div>
      ) : null}
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Batch</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Subject(s)</th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase text-slate-500">Tracking</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white">
          {classes.map((c) => {
            const active = activeSet.has(c.id);
            const finishedToday = completedTodaySet.has(c.id);
            return (
              <tr key={c.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-sm text-slate-900 font-medium">{c.name}</td>
                <td className="px-4 py-3 text-sm text-slate-600">{c.subjectLabel ?? "All assigned subjects"}</td>
                <td className="px-4 py-3 text-right">
                  {active ? (
                    <button
                      type="button"
                      onClick={() => end(c.id)}
                      disabled={loadingClassId === c.id}
                      className="rounded-lg bg-school-green px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      {loadingClassId === c.id ? "Ending..." : "End Class"}
                    </button>
                  ) : finishedToday ? (
                    <span className="text-sm font-medium text-slate-500">Completed today</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => start(c.id)}
                      disabled={loadingClassId === c.id || !!activeClassId}
                      className="btn-primary"
                    >
                      {loadingClassId === c.id ? "Starting..." : "Start Class"}
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

