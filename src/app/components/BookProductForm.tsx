"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function BookProductForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", sku: "", price: "", stock: "0", category: "book" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/school/book-products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          sku: form.sku || null,
          price: parseFloat(form.price) || 0,
          stock: parseInt(form.stock, 10) || 0,
          category: form.category,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || "Failed");
        return;
      }
      router.push("/school/books");
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
        <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="input-field mt-1" placeholder="e.g. Physics Notebook" required />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-slate-700">Price (₹) *</label>
          <input type="number" min={0} step={0.01} value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} className="input-field mt-1" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Stock</label>
          <input type="number" min={0} value={form.stock} onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))} className="input-field mt-1" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Category</label>
        <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className="input-field mt-1">
          <option value="book">Book</option>
          <option value="copy">Copy</option>
          <option value="stationery">Stationery</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">SKU</label>
        <input value={form.sku} onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))} className="input-field mt-1" />
      </div>
      <button type="submit" disabled={loading} className="btn-primary">Add product</button>
    </form>
  );
}
