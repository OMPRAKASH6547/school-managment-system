"use client";

import { useEffect, useMemo, useState } from "react";

type StudentReportRow = {
  studentId: string;
  firstName: string;
  lastName: string;
  rollNo: string | null;
  guardianPhone: string | null;
  counts: { present: number; absent: number; late: number; leave: number };
};

function normalizePhone(phone: string) {
  // Keep digits only (WhatsApp URLs expect numeric phone in most cases).
  return phone.replace(/\D/g, "");
}

export function TeacherMonthlyAttendanceReport() {
  const [month, setMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<StudentReportRow[]>([]);
  const [error, setError] = useState("");

  const monthLabel = useMemo(() => {
    const [y, m] = month.split("-");
    return `${m}/${y}`;
  }, [month]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/school/teacher/attendance-monthly?month=${encodeURIComponent(month)}`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.error || "Failed to load report");
        }
        const data = await res.json();
        if (cancelled) return;
        setRows(data.students ?? []);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load report");
        setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [month]);

  function buildWhatsAppText(r: StudentReportRow) {
    const roll = r.rollNo ? ` (Roll No: ${r.rollNo})` : "";
    return [
      `Monthly Attendance Report (${monthLabel})`,
      `Student: ${r.firstName} ${r.lastName}${roll}`,
      `Present: ${r.counts.present}`,
      `Absent: ${r.counts.absent}`,
      `Late: ${r.counts.late}`,
      `Leave: ${r.counts.leave}`,
      `Thank you.`,
    ].join("\n");
  }

  function handleShare(r: StudentReportRow) {
    if (!r.guardianPhone) return;
    const phone = normalizePhone(r.guardianPhone);
    if (!phone) return;
    const text = buildWhatsAppText(r);
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="mt-10 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-primary-600">Monthly Attendance Report</h2>
          <p className="mt-1 text-sm text-slate-600">
            Select month and share each student&apos;s report to the parent&apos;s WhatsApp number.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600">Month</label>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="input-field mt-1"
            />
          </div>
        </div>
      </div>

      {error && <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="mt-6 text-sm text-slate-500">Loading...</div>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Student</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Present</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Absent</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Late</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Leave</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-slate-500">Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {rows.map((r) => {
                const canShare = Boolean(r.guardianPhone && normalizePhone(r.guardianPhone).length >= 8);
                return (
                  <tr key={r.studentId} className="hover:bg-slate-50">
                    <td className="px-4 py-2 font-medium text-slate-900">
                      {r.firstName} {r.lastName}
                      {r.rollNo ? <span className="ml-1 text-slate-500">({r.rollNo})</span> : null}
                    </td>
                    <td className="px-4 py-2 text-slate-600">{r.counts.present}</td>
                    <td className="px-4 py-2 text-slate-600">{r.counts.absent}</td>
                    <td className="px-4 py-2 text-slate-600">{r.counts.late}</td>
                    <td className="px-4 py-2 text-slate-600">{r.counts.leave}</td>
                    <td className="px-4 py-2 text-right">
                      <button
                        type="button"
                        disabled={!canShare}
                        onClick={() => handleShare(r)}
                        className={`rounded-lg px-3 py-2 text-xs font-medium ${
                          canShare ? "bg-green-600 text-white hover:bg-green-700" : "bg-slate-200 text-slate-500 cursor-not-allowed"
                        }`}
                      >
                        WhatsApp
                      </button>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                    No attendance data for this month.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

