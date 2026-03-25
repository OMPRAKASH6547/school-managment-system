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

  const firstAvailable = useMemo(() => {
    return classes.find((c) => !assignedSet.has(c.id))?.id ?? classes[0]?.id ?? "";
  }, [assignedSet, classes]);

  const [selectedClassId, setSelectedClassId] = useState(firstAvailable);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!selectedClassId) return;
    setLoading(true);
    try {
      const res = await fetch("/api/school/teacher-assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teacherStaffId, classId: selectedClassId }),
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

  const disabled = assignedSet.has(selectedClassId);

  return (
    <form onSubmit={handleAssign} className="mt-2 flex items-center gap-2">
      <select
        value={selectedClassId}
        onChange={(e) => setSelectedClassId(e.target.value)}
        className="input-field flex-1 text-sm"
      >
        {classes.map((c) => (
          <option key={c.id} value={c.id} disabled={assignedSet.has(c.id)}>
            {c.name}
          </option>
        ))}
      </select>
      <button type="submit" disabled={loading || disabled} className="btn-primary">
        {loading ? "Assigning..." : "Assign"}
      </button>
      {error && <div className="mt-2 text-xs text-red-600">{error}</div>}
    </form>
  );
}

