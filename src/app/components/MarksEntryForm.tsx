"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type Subject = { id: string; name: string; maxMarks: number };
type Student = { id: string; firstName: string; lastName: string; rollNo: string | null; class: { name: string } | null };
type Result = { studentId: string; subjectId: string; marksObtained: number };

export function MarksEntryForm({
  exam,
  students,
  canPublish,
}: {
  exam: { id: string; status: string; subjects: Subject[] };
  students: Student[];
  canPublish: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [deletingResults, setDeletingResults] = useState(false);
  const [error, setError] = useState("");
  const [marks, setMarks] = useState<Record<string, Record<string, number>>>({});

  useEffect(() => {
    const initial: Record<string, Record<string, number>> = {};
    students.forEach((s) => {
      initial[s.id] = {};
      exam.subjects.forEach((sub) => {
        initial[s.id][sub.id] = 0;
      });
    });
    setMarks(initial);
  }, [exam.subjects, students]);

  async function loadExisting() {
    const res = await fetch(`/api/school/exams/${exam.id}/results`, { credentials: "include" });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Failed to load existing marks");
      return;
    }
    const data = await res.json();
    if (data.results?.length) {
      const next: Record<string, Record<string, number>> = {};
      students.forEach((s) => {
        next[s.id] = {};
        exam.subjects.forEach((sub) => {
          const r = data.results.find(
            (x: Result) => x.studentId === s.id && x.subjectId === sub.id
          );
          next[s.id][sub.id] = r ? r.marksObtained : 0;
        });
      });
      setMarks(next);
    }
  }

  useEffect(() => {
    loadExisting();
  }, [exam.id]);

  async function handleSave() {
    setError("");
    setLoading(true);
    try {
      const entries: { studentId: string; subjectId: string; marksObtained: number }[] = [];
      Object.entries(marks).forEach(([studentId, bySub]) => {
        Object.entries(bySub).forEach(([subjectId, marksObtained]) => {
          entries.push({ studentId, subjectId, marksObtained: Number(marksObtained) || 0 });
        });
      });
      const res = await fetch(`/api/school/exams/${exam.id}/results`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || "Failed to save");
        return;
      }
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save";
      setError(msg || "Failed to save");
    } finally {
      setLoading(false);
    }
  }

  async function handlePublish() {
    if (exam.status === "published") return;
    setError("");
    setPublishing(true);
    try {
      const res = await fetch(`/api/school/exams/${exam.id}/publish`, { method: "POST", credentials: "include" });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || "Failed to publish");
        return;
      }
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to publish";
      setError(msg || "Failed to publish");
    } finally {
      setPublishing(false);
    }
  }

  async function handleDeleteResults() {
    if (!confirm("Delete all saved results for this exam? This cannot be undone.")) return;
    setError("");
    setDeletingResults(true);
    try {
      const res = await fetch(`/api/school/exams/${exam.id}/results`, { method: "DELETE", credentials: "include" });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || "Failed to delete results");
        return;
      }
      await loadExisting();
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to delete results";
      setError(msg || "Failed to delete results");
    } finally {
      setDeletingResults(false);
    }
  }

  if (exam.subjects.length === 0) return <p className="text-slate-500">No subjects. Edit exam to add subjects.</p>;

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {error && <div className="bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Student</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Class</th>
              {exam.subjects.map((sub) => (
                <th key={sub.id} className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">
                  {sub.name} (max {sub.maxMarks})
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {students.map((s) => (
              <tr key={s.id} className="hover:bg-slate-50">
                <td className="px-4 py-2 font-medium text-school-navy">
                  {s.firstName} {s.lastName} {s.rollNo ? `(${s.rollNo})` : ""}
                </td>
                <td className="px-4 py-2 text-slate-600">{s.class?.name ?? "—"}</td>
                {exam.subjects.map((sub) => (
                  <td key={sub.id} className="px-4 py-2">
                    <input
                      type="number"
                      min={0}
                      max={sub.maxMarks}
                      value={marks[s.id]?.[sub.id] ?? ""}
                      onChange={(e) =>
                        setMarks((prev) => ({
                          ...prev,
                          [s.id]: {
                            ...prev[s.id],
                            [sub.id]: e.target.value === "" ? 0 : Number(e.target.value),
                          },
                        }))
                      }
                      className="input-field w-20 py-1 text-center text-sm"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3">
        <button type="button" onClick={handleSave} disabled={loading} className="btn-primary">
          {loading ? "Saving..." : "Save marks"}
        </button>
        {canPublish && exam.status !== "published" && (
          <button type="button" onClick={handlePublish} disabled={publishing} className="rounded-lg bg-school-green px-4 py-2 text-sm font-medium text-white hover:bg-green-700">
            {publishing ? "Publishing..." : "Publish results"}
          </button>
        )}
        {canPublish && (
          <button
            type="button"
            onClick={handleDeleteResults}
            disabled={deletingResults}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {deletingResults ? "Deleting..." : "Delete all results"}
          </button>
        )}
        {exam.status === "published" && (
          <span className="text-sm text-green-700">Results published. Students can view via their unique link.</span>
        )}
      </div>
    </div>
  );
}
