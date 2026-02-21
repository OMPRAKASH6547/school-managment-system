"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
  const [classFilter, setClassFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [statusByStudent, setStatusByStudent] = useState<Record<string, string>>({});

  const filtered = classFilter
    ? students.filter((s) => s.classId === classFilter)
    : students;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const entries = Object.entries(statusByStudent).filter(([, v]) => v !== "");
      if (entries.length === 0) {
        setError("Mark at least one student.");
        setLoading(false);
        return;
      }
      const res = await fetch("/api/school/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          entries: entries.map(([studentId, status]) => ({ studentId, status })),
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
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="input-field mt-1"
          >
            <option value="">All</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
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
      <button type="submit" disabled={loading || filtered.length === 0} className="btn-primary mt-6">
        {loading ? "Saving..." : "Save attendance"}
      </button>
    </form>
  );
}
