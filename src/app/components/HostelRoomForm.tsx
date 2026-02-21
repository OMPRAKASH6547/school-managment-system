"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function HostelRoomForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", capacity: "1", floor: "", rent: "" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/school/hostel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          capacity: parseInt(form.capacity, 10) || 1,
          floor: form.floor || null,
          rent: form.rent ? parseFloat(form.rent) : null,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || "Failed");
        return;
      }
      router.push("/school/hostel");
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
        <label className="block text-sm font-medium text-slate-700">Room name *</label>
        <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="input-field mt-1" placeholder="e.g. Block A-101" required />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-slate-700">Capacity</label>
          <input type="number" min={1} value={form.capacity} onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))} className="input-field mt-1" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Floor</label>
          <input value={form.floor} onChange={(e) => setForm((f) => ({ ...f, floor: e.target.value }))} className="input-field mt-1" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Rent (₹)</label>
        <input type="number" min={0} step={0.01} value={form.rent} onChange={(e) => setForm((f) => ({ ...f, rent: e.target.value }))} className="input-field mt-1" />
      </div>
      <button type="submit" disabled={loading} className="btn-primary">Add room</button>
    </form>
  );
}
