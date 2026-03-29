"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ACTIVE_INACTIVE_STATUS_ITEMS,
  SearchablePaginatedSelect,
  type SearchableSelectItem,
} from "@/app/components/SearchablePaginatedSelect";

type Class = {
  id: string;
  name: string;
  subjects?: string | null;
  section: string | null;
  academicYear: string | null;
  capacity: number | null;
  room: string | null;
  status: string;
};

export function ClassForm({ cls }: { cls?: Class | null }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: cls?.name ?? "",
    section: cls?.section ?? "",
    academicYear: cls?.academicYear ?? "",
    capacity: cls?.capacity ?? "",
    room: cls?.room ?? "",
    status: cls?.status ?? "active",
  });
  const [newSubject, setNewSubject] = useState("");
  const [subjects, setSubjects] = useState<string[]>(
    (cls?.subjects ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  );

  const url = cls ? `/api/school/classes/${cls.id}` : "/api/school/classes";
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          capacity: form.capacity === "" ? null : Number(form.capacity),
          subjects,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed");
        return;
      }
      router.push("/school/classes");
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
        <label className="block text-sm font-medium text-slate-700">Name *</label>
        <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="input-field mt-1" placeholder="e.g. Class 10-A" required />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-slate-700">Section</label>
          <input value={form.section} onChange={(e) => setForm((f) => ({ ...f, section: e.target.value }))} className="input-field mt-1" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Academic year</label>
          <input value={form.academicYear} onChange={(e) => setForm((f) => ({ ...f, academicYear: e.target.value }))} className="input-field mt-1" placeholder="e.g. 2024-25" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-slate-700">Capacity</label>
          <input type="number" min={0} value={form.capacity} onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))} className="input-field mt-1" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Room</label>
          <input value={form.room} onChange={(e) => setForm((f) => ({ ...f, room: e.target.value }))} className="input-field mt-1" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Subjects for this class</label>
        <p className="mt-1 text-xs text-slate-500">These subjects are separate branch-wise with class data.</p>
        <div className="mt-2 flex gap-2">
          <input
            value={newSubject}
            onChange={(e) => setNewSubject(e.target.value)}
            className="input-field flex-1"
            placeholder="e.g. Mathematics"
          />
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              const value = newSubject.trim();
              if (!value) return;
              if (!subjects.some((s) => s.toLowerCase() === value.toLowerCase())) {
                setSubjects((prev) => [...prev, value]);
              }
              setNewSubject("");
            }}
          >
            Add
          </button>
        </div>
        {subjects.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {subjects.map((subject) => (
              <span key={subject} className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-800">
                {subject}
                <button
                  type="button"
                  className="rounded p-0.5 text-slate-500 hover:bg-slate-200"
                  aria-label={`Remove ${subject}`}
                  onClick={() => setSubjects((prev) => prev.filter((s) => s !== subject))}
                >
                  x
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
      {cls && (
        <div>
          <label className="block text-sm font-medium text-slate-700">Status</label>
          <SearchablePaginatedSelect
            items={ACTIVE_INACTIVE_STATUS_ITEMS}
            value={form.status}
            onChange={(v) => setForm((f) => ({ ...f, status: v }))}
            emptyLabel="Status"
            required
            className="mt-1"
            aria-label="Class status"
          />
        </div>
      )}
      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={loading}
          aria-busy={loading}
          className={`btn-primary ${loading ? "btn-loading" : ""}`}
        >
          {loading ? "Saving..." : cls ? "Update" : "Create"}
        </button>
        <button type="button" onClick={() => router.back()} className="btn-secondary">
          Cancel
        </button>
      </div>
    </form>
  );
}
