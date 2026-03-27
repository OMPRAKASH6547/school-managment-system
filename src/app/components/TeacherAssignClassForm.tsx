"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export function TeacherAssignClassForm({
  teacherStaffId,
  classes,
  assignedClassIds,
}: {
  teacherStaffId: string;
  classes: { id: string; name: string }[];
  assignedClassIds: string[];
}) {
  const router = useRouter();
  const assignedSet = useMemo(() => new Set(assignedClassIds), [assignedClassIds]);

  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!selectedClassIds.length) {
      setError("Select at least one class");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/school/teacher-assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teacherStaffId, classIds: selectedClassIds }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Failed to assign");
        return;
      }
      router.refresh();
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (!classes.length) {
    return <span className="text-xs text-slate-500">No active classes</span>;
  }

  return (
    <form onSubmit={handleAssign} className="mt-2 space-y-2">
      <select
        multiple
        value={selectedClassIds}
        onChange={(e) => {
          const values = Array.from(e.target.selectedOptions).map((o) => o.value);
          setSelectedClassIds(values);
        }}
        className="input-field w-full text-sm min-h-24"
      >
        {classes.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}{assignedSet.has(c.id) ? " (already assigned)" : ""}
          </option>
        ))}
      </select>
      <div className="flex items-center gap-2">
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? "Assigning..." : "Assign selected classes"}
        </button>
        <span className="text-xs text-slate-500">Hold Ctrl/Cmd for multi-select.</span>
      </div>
      {error && <div className="text-xs text-red-600">{error}</div>}
    </form>
  );
}

