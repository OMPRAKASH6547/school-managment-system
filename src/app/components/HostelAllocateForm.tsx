"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { SearchablePaginatedSelect } from "@/app/components/SearchablePaginatedSelect";

type Opt = { id: string; label: string };

export function HostelAllocateForm({ roomId, students }: { roomId: string; students: Opt[] }) {
  const router = useRouter();
  const [studentId, setStudentId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const studentItems = useMemo(() => students.map((s) => ({ value: s.id, label: s.label })), [students]);

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
        <SearchablePaginatedSelect
          items={studentItems}
          value={studentId}
          onChange={setStudentId}
          emptyLabel="Select student"
          required
          className="mt-1"
          aria-label="Student"
        />
      </div>
      <button type="submit" disabled={loading} className="btn-primary">
        {loading ? "Saving…" : "Allocate"}
      </button>
    </form>
  );
}
