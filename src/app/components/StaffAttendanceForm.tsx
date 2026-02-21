"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
  const [error, setError] = useState("");
  const [statusByStaff, setStatusByStaff] = useState<Record<string, string>>({});

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
    </form>
  );
}
