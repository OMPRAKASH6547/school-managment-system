"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function PlanCreateForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    price: "",
    maxStudents: "100",
    maxStaff: "10",
    isActive: true,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/super-admin/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          slug: form.slug.trim().toLowerCase(),
          description: form.description || undefined,
          price: Number(form.price),
          maxStudents: Number(form.maxStudents),
          maxStaff: Number(form.maxStaff),
          isActive: form.isActive,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Failed");
        return;
      }
      setForm({
        name: "",
        slug: "",
        description: "",
        price: "",
        maxStudents: "100",
        maxStaff: "10",
        isActive: true,
      });
      router.refresh();
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card mt-6 space-y-3">
      <h3 className="text-base font-semibold text-slate-900">Create subscription plan</h3>
      {error && <div className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</div>}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-slate-700">Name *</label>
          <input
            className="input-field mt-1"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Slug *</label>
          <input
            className="input-field mt-1"
            value={form.slug}
            onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }))}
            placeholder="e.g. pro-monthly"
            required
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Description</label>
        <textarea
          className="input-field mt-1 min-h-[72px]"
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="block text-sm font-medium text-slate-700">Price (₹/mo) *</label>
          <input type="number" min={1} step={1} className="input-field mt-1" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} required />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Max students *</label>
          <input type="number" min={1} className="input-field mt-1" value={form.maxStudents} onChange={(e) => setForm((f) => ({ ...f, maxStudents: e.target.value }))} required />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Max staff *</label>
          <input type="number" min={1} className="input-field mt-1" value={form.maxStaff} onChange={(e) => setForm((f) => ({ ...f, maxStaff: e.target.value }))} required />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} />
        Active (visible on home page)
      </label>
      <button type="submit" disabled={loading} className="btn-primary">
        {loading ? "Creating…" : "Create plan"}
      </button>
    </form>
  );
}
