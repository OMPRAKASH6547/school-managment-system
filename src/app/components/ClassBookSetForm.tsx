"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ClassOpt = { id: string; name: string };

type SetItem = {
  name: string;
  price: string;
  stock: string;
  category: string;
};

export function ClassBookSetForm({ classes }: { classes: ClassOpt[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [classId, setClassId] = useState(classes[0]?.id ?? "");
  const [setName, setSetName] = useState("");
  const [items, setItems] = useState<SetItem[]>([
    { name: "", price: "", stock: "0", category: "book" },
    { name: "", price: "", stock: "0", category: "book" },
    { name: "", price: "", stock: "0", category: "book" },
  ]);

  function updateItem(idx: number, key: keyof SetItem, value: string) {
    setItems((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [key]: value };
      return next;
    });
  }

  function addRow() {
    setItems((prev) => [...prev, { name: "", price: "", stock: "0", category: "book" }]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const filtered = items.filter((i) => i.name.trim());
    if (!classId) return setError("Select class");
    if (filtered.length === 0) return setError("Add at least one item");

    setLoading(true);
    try {
      const res = await fetch("/api/school/book-products/class-set", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId,
          setName: setName || null,
          items: filtered.map((i) => ({
            name: i.name,
            price: Number(i.price) || 0,
            stock: Number(i.stock) || 0,
            category: i.category || "book",
          })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Failed");
        return;
      }
      setSetName("");
      setItems([{ name: "", price: "", stock: "0", category: "book" }]);
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
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-slate-700">Class *</label>
          <select value={classId} onChange={(e) => setClassId(e.target.value)} className="input-field mt-1" required>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Set name (optional)</label>
          <input
            value={setName}
            onChange={(e) => setSetName(e.target.value)}
            className="input-field mt-1"
            placeholder="e.g. Session 2026 starter set"
          />
        </div>
      </div>

      <div className="space-y-2">
        {items.map((row, idx) => (
          <div key={idx} className="grid gap-2 sm:grid-cols-4">
            <input
              value={row.name}
              onChange={(e) => updateItem(idx, "name", e.target.value)}
              className="input-field"
              placeholder="Product name"
            />
            <input
              type="number"
              min={0}
              step={0.01}
              value={row.price}
              onChange={(e) => updateItem(idx, "price", e.target.value)}
              className="input-field"
              placeholder="Price"
            />
            <input
              type="number"
              min={0}
              value={row.stock}
              onChange={(e) => updateItem(idx, "stock", e.target.value)}
              className="input-field"
              placeholder="Stock"
            />
            <select value={row.category} onChange={(e) => updateItem(idx, "category", e.target.value)} className="input-field">
              <option value="book">Book</option>
              <option value="copy">Copy</option>
              <option value="stationery">Stationery</option>
            </select>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <button type="button" onClick={addRow} className="btn-secondary">
          + Add row
        </button>
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? "Creating set..." : "Create class-wise set"}
        </button>
      </div>
    </form>
  );
}
