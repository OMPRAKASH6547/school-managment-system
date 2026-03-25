"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function TeacherClassTrackingControls({
  classes,
  activeClassIds,
}: {
  classes: { id: string; name: string }[];
  activeClassIds: string[];
}) {
  const router = useRouter();
  const activeSet = new Set(activeClassIds);
  const [loadingClassId, setLoadingClassId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function start(classId: string) {
    setError(null);
    setLoadingClassId(classId);
    try {
      const res = await fetch("/api/school/teacher-class-sessions/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Start failed");
        return;
      }
      router.refresh();
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "End failed");
        return;
      }
      router.refresh();
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
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Class</th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase text-slate-500">Tracking</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white">
          {classes.map((c) => {
            const active = activeSet.has(c.id);
            return (
              <tr key={c.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-sm text-slate-900 font-medium">{c.name}</td>
                <td className="px-4 py-3 text-right">
                  {!active ? (
                    <button
                      type="button"
                      onClick={() => start(c.id)}
                      disabled={loadingClassId === c.id}
                      className="btn-primary"
                    >
                      {loadingClassId === c.id ? "Starting..." : "Start"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => end(c.id)}
                      disabled={loadingClassId === c.id}
                      className="rounded-lg bg-school-green px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      {loadingClassId === c.id ? "Ending..." : "End"}
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

