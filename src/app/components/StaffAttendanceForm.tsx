"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { SearchablePaginatedSelect } from "@/app/components/SearchablePaginatedSelect";

type StaffMember = { id: string; firstName: string; lastName: string; role: string };

export function StaffAttendanceForm({
  staff,
  defaultDate,
}: {
  staff: StaffMember[];
  defaultDate: string;
}) {
  const router = useRouter();
  const [date, setDate] = useState(defaultDate);
  const [loading, setLoading] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [error, setError] = useState("");
  const [statusByStaff, setStatusByStaff] = useState<Record<string, string>>({});
  const [historyStaffId, setHistoryStaffId] = useState("");
  const [historyMonth, setHistoryMonth] = useState(defaultDate.slice(0, 7));
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyData, setHistoryData] = useState<{
    staff?: { name: string; role: string };
    summary?: { present: number; absent: number; late: number; leave: number };
    records?: { date: string; status: string }[];
    month?: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadExisting() {
      setLoadingExisting(true);
      try {
        const qs = new URLSearchParams();
        qs.set("date", date);
        const res = await fetch(`/api/school/staff-attendance?${qs.toString()}`);
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        setStatusByStaff(data.statuses ?? {});
      } finally {
        if (!cancelled) setLoadingExisting(false);
      }
    }
    loadExisting();
    return () => {
      cancelled = true;
    };
  }, [date]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const entries = Object.entries(statusByStaff).filter(([, v]) => v !== "");
    if (entries.length === 0) {
      setError("Mark at least one staff.");
      setLoading(false);
      return;
    }
    try {
      const res = await fetch("/api/school/staff-attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, entries: entries.map(([staffId, status]) => ({ staffId, status })) }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || "Failed");
        return;
      }
      setStatusByStaff({});
      router.refresh();
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function loadStaffHistory() {
    if (!historyStaffId) {
      setHistoryData(null);
      return;
    }
    setHistoryLoading(true);
    setError("");
    try {
      const qs = new URLSearchParams();
      qs.set("staffId", historyStaffId);
      qs.set("month", historyMonth);
      const res = await fetch(`/api/school/staff-attendance?${qs.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to load staff attendance");
        setHistoryData(null);
        return;
      }
      setHistoryData(data);
    } catch {
      setError("Failed to load staff attendance");
      setHistoryData(null);
    } finally {
      setHistoryLoading(false);
    }
  }

  const historyStaffItems = useMemo(
    () =>
      staff.map((s) => ({
        value: s.id,
        label: `${s.firstName} ${s.lastName} (${s.role})`,
      })),
    [staff],
  );

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <div className="mb-4">
        <label className="block text-sm font-medium text-slate-700">Date</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input-field mt-1 w-48" required />
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Staff</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Role</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {staff.map((s) => (
              <tr key={s.id} className="hover:bg-slate-50">
                <td className="px-4 py-2 font-medium text-school-navy">{s.firstName} {s.lastName}</td>
                <td className="px-4 py-2 text-slate-600">{s.role}</td>
                <td className="px-4 py-2">
                  <select
                    value={statusByStaff[s.id] ?? ""}
                    onChange={(e) => setStatusByStaff((prev) => ({ ...prev, [s.id]: e.target.value }))}
                    className="input-field py-1 text-sm w-32"
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
      <button type="submit" disabled={loading || staff.length === 0} className="btn-primary mt-6">
        {loading ? "Saving..." : "Save attendance"}
      </button>
      {loadingExisting && staff.length > 0 && (
        <p className="mt-3 text-xs text-slate-500">Loading saved attendance...</p>
      )}

      <div className="mt-8 border-t border-slate-200 pt-6">
        <h3 className="text-base font-semibold text-slate-900">Staff attendance report</h3>
        <p className="mt-1 text-xs text-slate-500">View monthly attendance for a particular staff member.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-slate-700">Staff member</label>
            <SearchablePaginatedSelect
              items={historyStaffItems}
              value={historyStaffId}
              onChange={setHistoryStaffId}
              emptyLabel="Select staff"
              className="mt-1"
              aria-label="Staff for report"
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
            <button type="button" onClick={loadStaffHistory} disabled={historyLoading} className="btn-secondary w-full">
              {historyLoading ? "Loading..." : "View report"}
            </button>
          </div>
        </div>
        {historyData?.staff && (
          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
            <div className="font-medium text-slate-900">{historyData.staff.name}</div>
            <div className="text-slate-600">{historyData.staff.role} | {historyData.month}</div>
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
