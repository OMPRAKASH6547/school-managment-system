"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function BookProductEditForm({
  product,
}: {
  product: { id: string; name: string; sku: string | null; price: number; stock: number; category: string | null; status: string };
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: product.name,
    sku: product.sku ?? "",
    price: String(product.price),
    stock: String(product.stock),
    category: product.category ?? "book",
    status: product.status,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/school/book-products/${product.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          sku: form.sku || null,
          price: Number(form.price) || 0,
          stock: Number(form.stock) || 0,
          category: form.category || null,
          status: form.status,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Failed");
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
        <input className="input-field mt-1" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-slate-700">Price (₹)</label>
          <input type="number" min={0} step={0.01} className="input-field mt-1" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Stock</label>
          <input type="number" min={0} className="input-field mt-1" value={form.stock} onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-slate-700">Category</label>
          <select className="input-field mt-1" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
            <option value="book">Book</option>
            <option value="copy">Copy</option>
            <option value="stationery">Stationery</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Status</label>
          <select className="input-field mt-1" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">SKU</label>
        <input className="input-field mt-1" value={form.sku} onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))} />
      </div>
      <button type="submit" disabled={loading} className="btn-primary">
        {loading ? "Saving..." : "Save changes"}
      </button>
    </form>
  );
}
