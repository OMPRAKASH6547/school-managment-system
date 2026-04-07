"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type ExpenseRow = {
  id: string;
  title: string;
  category: string | null;
  amount: number;
  expenseDate: string;
  paymentMethod: string | null;
  notes: string | null;
};

type Props = {
  rows: ExpenseRow[];
  total: number;
  totalAmount: number;
  page: number;
  totalPages: number;
  query: { q: string; category: string; from: string; to: string };
};

function blank() {
  return {
    id: "",
    title: "",
    category: "",
    amount: "",
    expenseDate: new Date().toISOString().slice(0, 10),
    paymentMethod: "cash",
    notes: "",
  };
}

export function ExpenseManager({ rows, total, totalAmount, page, totalPages, query }: Props) {
  const router = useRouter();
  const [form, setForm] = useState(blank());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(() => form.title.trim().length >= 2 && Number(form.amount) > 0, [form]);

  async function submit() {
    setError("");
    setLoading(true);
    try {
      const payload = {
        title: form.title.trim(),
        category: form.category.trim() || undefined,
        amount: Number(form.amount),
        expenseDate: form.expenseDate,
        paymentMethod: form.paymentMethod.trim() || undefined,
        notes: form.notes.trim() || undefined,
      };
      const url = editingId ? `/api/school/expenses/${editingId}` : "/api/school/expenses";
      const method = editingId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Save failed");
        return;
      }
      setForm(blank());
      setEditingId(null);
      router.refresh();
    } catch {
      setError("Save failed");
    } finally {
      setLoading(false);
    }
  }

  function beginEdit(row: ExpenseRow) {
    setEditingId(row.id);
    setForm({
      id: row.id,
      title: row.title,
      category: row.category ?? "",
      amount: String(row.amount),
      expenseDate: row.expenseDate.slice(0, 10),
      paymentMethod: row.paymentMethod ?? "cash",
      notes: row.notes ?? "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function remove(id: string) {
    if (!confirm("Delete this expense?")) return;
    const res = await fetch(`/api/school/expenses/${id}`, { method: "DELETE" });
    if (res.ok) router.refresh();
  }

  function hrefPage(nextPage: number) {
    const p = new URLSearchParams();
    if (query.q) p.set("q", query.q);
    if (query.category) p.set("category", query.category);
    if (query.from) p.set("from", query.from);
    if (query.to) p.set("to", query.to);
    p.set("page", String(nextPage));
    return `/school/expenses?${p.toString()}`;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">{editingId ? "Edit expense" : "Add expense"}</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <input className="input-field" placeholder="Title *" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          <input className="input-field" placeholder="Category (Transport, Salary...)" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} />
          <input className="input-field" type="number" min="0" step="0.01" placeholder="Amount *" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
          <input className="input-field" type="date" value={form.expenseDate} onChange={(e) => setForm((f) => ({ ...f, expenseDate: e.target.value }))} />
          <select className="input-field" value={form.paymentMethod} onChange={(e) => setForm((f) => ({ ...f, paymentMethod: e.target.value }))}>
            <option value="cash">cash</option>
            <option value="upi">upi</option>
            <option value="card">card</option>
            <option value="bank_transfer">bank_transfer</option>
            <option value="cheque">cheque</option>
            <option value="other">other</option>
          </select>
          <input className="input-field" placeholder="Notes (optional)" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
        </div>
        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
        <div className="mt-3 flex gap-2">
          <button className="btn-primary" type="button" onClick={submit} disabled={!canSubmit || loading}>
            {loading ? "Saving..." : editingId ? "Update expense" : "Add expense"}
          </button>
          {editingId ? (
            <button className="btn-secondary" type="button" onClick={() => { setEditingId(null); setForm(blank()); }}>
              Cancel edit
            </button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4">
          <p className="text-xs uppercase tracking-wide text-indigo-700">Total expenses (filtered)</p>
          <p className="mt-1 text-xl font-bold text-indigo-900">INR {totalAmount.toFixed(2)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Records</p>
          <p className="mt-1 text-xl font-bold text-slate-900">{total}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Page</p>
          <p className="mt-1 text-xl font-bold text-slate-900">{page} / {totalPages}</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-0 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm whitespace-nowrap">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs uppercase text-slate-500">Date</th>
                <th className="px-4 py-3 text-left text-xs uppercase text-slate-500">Title</th>
                <th className="px-4 py-3 text-left text-xs uppercase text-slate-500">Category</th>
                <th className="px-4 py-3 text-left text-xs uppercase text-slate-500">Method</th>
                <th className="px-4 py-3 text-right text-xs uppercase text-slate-500">Amount</th>
                <th className="px-4 py-3 text-right text-xs uppercase text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3 text-slate-700">{new Date(r.expenseDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-slate-900">{r.title}</td>
                  <td className="px-4 py-3 text-slate-700">{r.category ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-700">{r.paymentMethod ?? "—"}</td>
                  <td className="px-4 py-3 text-right font-medium text-slate-900">INR {r.amount.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-3 text-xs">
                      <button className="text-primary-600 hover:underline" onClick={() => beginEdit(r)}>Edit</button>
                      <button className="text-red-600 hover:underline" onClick={() => void remove(r.id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">No expenses found.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm text-slate-600">
          <span>{total} record(s)</span>
          <div className="flex gap-2">
            {page > 1 ? <a className="btn-secondary" href={hrefPage(page - 1)}>Previous</a> : null}
            {page < totalPages ? <a className="btn-secondary" href={hrefPage(page + 1)}>Next</a> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
