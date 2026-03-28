"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { SearchablePaginatedSelect } from "@/app/components/SearchablePaginatedSelect";

type Student = {
  id: string;
  firstName: string;
  lastName: string;
  classId: string | null;
  class: { name: string } | null;
};
type Class = { id: string; name: string };

export function AttendanceForm({
  students,
  classes,
  defaultDate,
}: {
  students: Student[];
  classes: Class[];
  defaultDate: string;
}) {
  const router = useRouter();
  const [date, setDate] = useState(defaultDate);
  const [classFilter, setClassFilter] = useState(classes[0]?.id ?? "");
  const [loading, setLoading] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [error, setError] = useState("");
  const [statusByStudent, setStatusByStudent] = useState<Record<string, string>>({});
  const [historyStudentId, setHistoryStudentId] = useState("");
  const [historyMonth, setHistoryMonth] = useState(defaultDate.slice(0, 7));
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyData, setHistoryData] = useState<{
    student?: { name: string; className: string | null };
    summary?: { present: number; absent: number; late: number; leave: number };
    records?: { date: string; status: string }[];
    month?: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadExisting() {
      setLoadingExisting(true);
      setError("");
      try {
        const qs = new URLSearchParams();
        qs.set("date", date);
        if (!classFilter) {
          setStatusByStudent({});
          return;
        }
        qs.set("classId", classFilter);

        const res = await fetch(`/api/school/attendance?${qs.toString()}`);
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;

        const next: Record<string, string> = {};
        for (const [studentId, status] of Object.entries<string>(data.statuses ?? {})) {
          next[studentId] = status;
        }
        setStatusByStudent(next);
      } catch {
        // ignore load errors; saving still works
      } finally {
        if (!cancelled) setLoadingExisting(false);
      }
    }

    loadExisting();
    return () => {
      cancelled = true;
    };
  }, [date, classFilter]);

  const classItems = useMemo(() => classes.map((c) => ({ value: c.id, label: c.name })), [classes]);
  const historyStudentItems = useMemo(
    () =>
      students.map((s) => ({
        value: s.id,
        label: `${s.firstName} ${s.lastName} (${s.class?.name ?? "No class"})`,
      })),
    [students],
  );

  const filtered = classFilter ? students.filter((s) => s.classId === classFilter) : [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const entries = Object.entries(statusByStudent).filter(([, v]) => v !== "");
      const selectedStudentIds = new Set(filtered.map((s) => s.id));
      const classEntries = entries.filter(([studentId]) => selectedStudentIds.has(studentId));
      if (!classFilter) {
        setError("Select class first.");
        setLoading(false);
        return;
      }
      if (classEntries.length === 0) {
        setError("Mark at least one student.");
        setLoading(false);
        return;
      }
      const res = await fetch("/api/school/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          entries: classEntries.map(([studentId, status]) => ({ studentId, status })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed");
        return;
      }
      setStatusByStudent({});
      router.refresh();
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function loadStudentHistory() {
    if (!historyStudentId) {
      setHistoryData(null);
      return;
    }
    setHistoryLoading(true);
    setError("");
    try {
      const qs = new URLSearchParams();
      qs.set("studentId", historyStudentId);
      qs.set("month", historyMonth);
      const res = await fetch(`/api/school/attendance?${qs.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to load student attendance");
        setHistoryData(null);
        return;
      }
      setHistoryData(data);
    } catch {
      setError("Failed to load student attendance");
      setHistoryData(null);
    } finally {
      setHistoryLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <div className="flex flex-wrap gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="input-field mt-1"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Class</label>
          <SearchablePaginatedSelect
            items={classItems}
            value={classFilter}
            onChange={setClassFilter}
            emptyLabel="Select class"
            required
            className="mt-1"
            aria-label="Class"
          />
        </div>
      </div>
      <div className="mt-6 overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Student</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Class</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {filtered.map((s) => (
              <tr key={s.id} className="hover:bg-slate-50">
                <td className="px-4 py-2 font-medium text-slate-900">
                  {s.firstName} {s.lastName}
                </td>
                <td className="px-4 py-2 text-slate-600">{s.class?.name ?? "—"}</td>
                <td className="px-4 py-2">
                  <select
                    value={statusByStudent[s.id] ?? ""}
                    onChange={(e) => setStatusByStudent((prev) => ({ ...prev, [s.id]: e.target.value }))}
                    className="input-field py-1 text-sm"
                  >
                    <option value="">—</option>
                    <option value="present">Present</option>
                    <option value="absent">Absent</option>
                    <option value="late">Late</option>
                    <option value="leave">Leave</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filtered.length === 0 && (
        <p className="mt-4 text-slate-500">No students to show. Select a class or add students.</p>
      )}
      {loadingExisting && filtered.length > 0 && (
        <p className="mt-4 text-xs text-slate-500">Loading saved attendance...</p>
      )}
      <button type="submit" disabled={loading || filtered.length === 0} className="btn-primary mt-6">
        {loading ? "Saving..." : "Save attendance"}
      </button>

      <div className="mt-8 border-t border-slate-200 pt-6">
        <h3 className="text-base font-semibold text-slate-900">Student attendance report</h3>
        <p className="mt-1 text-xs text-slate-500">Teacher/Admin can view all attendance for a particular student (month wise).</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-slate-700">Student</label>
            <SearchablePaginatedSelect
              items={historyStudentItems}
              value={historyStudentId}
              onChange={setHistoryStudentId}
              emptyLabel="Select student"
              className="mt-1"
              aria-label="Student for report"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Month</label>
            <input
              type="month"
              value={historyMonth}
              onChange={(e) => setHistoryMonth(e.target.value)}
              className="input-field mt-1"
            />
          </div>
          <div className="flex items-end">
            <button type="button" onClick={loadStudentHistory} disabled={historyLoading} className="btn-secondary w-full">
              {historyLoading ? "Loading..." : "View report"}
            </button>
          </div>
        </div>
        {historyData?.student && (
          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
            <div className="font-medium text-slate-900">{historyData.student.name}</div>
            <div className="text-slate-600">{historyData.student.className ?? "No class"} | {historyData.month}</div>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <span className="rounded bg-green-100 px-2 py-1 text-green-700">Present: {historyData.summary?.present ?? 0}</span>
              <span className="rounded bg-red-100 px-2 py-1 text-red-700">Absent: {historyData.summary?.absent ?? 0}</span>
              <span className="rounded bg-yellow-100 px-2 py-1 text-yellow-700">Late: {historyData.summary?.late ?? 0}</span>
              <span className="rounded bg-slate-200 px-2 py-1 text-slate-700">Leave: {historyData.summary?.leave ?? 0}</span>
            </div>
            <div className="mt-3 max-h-56 overflow-auto rounded border border-slate-200 bg-white">
              <table className="min-w-full divide-y divide-slate-200 text-xs">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium uppercase text-slate-500">Date</th>
                    <th className="px-3 py-2 text-left font-medium uppercase text-slate-500">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(historyData.records ?? []).map((r) => (
                    <tr key={`${r.date}-${r.status}`}>
                      <td className="px-3 py-2 text-slate-700">{r.date}</td>
                      <td className="px-3 py-2 capitalize text-slate-900">{r.status}</td>
                    </tr>
                  ))}
                  {(historyData.records ?? []).length === 0 && (
                    <tr>
                      <td colSpan={2} className="px-3 py-3 text-slate-500">No records for selected month.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </form>
  );
}
