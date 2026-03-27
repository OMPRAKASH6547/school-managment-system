"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Opt = { id: string; label: string };

export function HostelAllocateForm({ roomId, students }: { roomId: string; students: Opt[] }) {
  const router = useRouter();
  const [studentId, setStudentId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!studentId) return;
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/school/hostel/allocations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, studentId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed");
        return;
      }
      setStudentId("");
      router.refresh();
    } catch {
      setError("Failed");
    } finally {
      setLoading(false);
    }
  }

  if (students.length === 0) {
    return <p className="text-sm text-amber-700">Add students with roll numbers in Students first.</p>;
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-3">
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div>
        <label className="block text-sm font-medium text-slate-700">Allocate student to this room</label>
        <select
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          className="input-field mt-1"
          required
        >
          <option value="">Select student</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
      <button type="submit" disabled={loading} className="btn-primary">
        {loading ? "Saving…" : "Allocate"}
      </button>
    </form>
  );
}
