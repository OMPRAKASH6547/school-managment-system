"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Class = { id: string; name: string };

export function ExamForm({
  organizationId,
  classes,
}: {
  organizationId: string;
  classes: Class[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [examType, setExamType] = useState("mid_term");
  const [classId, setClassId] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [subjects, setSubjects] = useState<{ name: string; maxMarks: string }[]>([
    { name: "", maxMarks: "100" },
  ]);

  function addSubject() {
    setSubjects((s) => [...s, { name: "", maxMarks: "100" }]);
  }
  function removeSubject(i: number) {
    setSubjects((s) => s.filter((_, idx) => idx !== i));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const subj = subjects.filter((s) => s.name.trim());
    if (!name.trim() || subj.length === 0) {
      setError("Enter exam name and at least one subject.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/school/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId,
          name: name.trim(),
          examType,
          classId: classId || null,
          academicYear: academicYear || null,
          subjects: subj.map((s) => ({ name: s.name, maxMarks: Number(s.maxMarks) || 100 })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed");
        return;
      }
      router.push("/school/examinations");
      router.refresh();
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <div>
        <label className="block text-sm font-medium text-slate-700">Exam name *</label>
        <input value={name} onChange={(e) => setName(e.target.value)} className="input-field mt-1" placeholder="e.g. Half Yearly 2024-25" required />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-slate-700">Type</label>
          <select value={examType} onChange={(e) => setExamType(e.target.value)} className="input-field mt-1">
            <option value="unit_test">Unit Test</option>
            <option value="mid_term">Mid Term</option>
            <option value="final">Final</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Class (optional)</label>
          <select value={classId} onChange={(e) => setClassId(e.target.value)} className="input-field mt-1">
            <option value="">All</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Academic year</label>
        <input value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} className="input-field mt-1" placeholder="e.g. 2024-25" />
      </div>
      <div>
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-slate-700">Subjects *</label>
          <button type="button" onClick={addSubject} className="text-sm text-primary-600 hover:underline">+ Add subject</button>
        </div>
        <div className="mt-2 space-y-2">
          {subjects.map((s, i) => (
            <div key={i} className="flex gap-2">
              <input value={s.name} onChange={(e) => setSubjects((prev) => { const n = [...prev]; n[i].name = e.target.value; return n; })} className="input-field flex-1" placeholder="Subject name" />
              <input type="number" min={0} value={s.maxMarks} onChange={(e) => setSubjects((prev) => { const n = [...prev]; n[i].maxMarks = e.target.value; return n; })} className="input-field w-24" placeholder="Max" />
              <button type="button" onClick={() => removeSubject(i)} className="text-slate-400 hover:text-red-600">×</button>
            </div>
          ))}
        </div>
      </div>
      <button type="submit" disabled={loading} className="btn-primary">Create exam</button>
    </form>
  );
}
