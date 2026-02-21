"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AddBookForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ title: "", author: "", isbn: "", category: "", totalCopies: "1" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/school/library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, totalCopies: parseInt(form.totalCopies, 10) || 1 }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || "Failed");
        return;
      }
      router.push("/school/library");
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
        <label className="block text-sm font-medium text-slate-700">Title *</label>
        <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className="input-field mt-1" required />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Author</label>
        <input value={form.author} onChange={(e) => setForm((f) => ({ ...f, author: e.target.value }))} className="input-field mt-1" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-slate-700">ISBN</label>
          <input value={form.isbn} onChange={(e) => setForm((f) => ({ ...f, isbn: e.target.value }))} className="input-field mt-1" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Total copies *</label>
          <input type="number" min={1} value={form.totalCopies} onChange={(e) => setForm((f) => ({ ...f, totalCopies: e.target.value }))} className="input-field mt-1" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Category</label>
        <input value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className="input-field mt-1" placeholder="e.g. Fiction, Reference" />
      </div>
      <button type="submit" disabled={loading} className="btn-primary">Add book</button>
    </form>
  );
}
