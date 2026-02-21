"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type FeePlan = { id: string; name: string; amount: number };
type Student = { id: string; firstName: string; lastName: string };

export function RecordPaymentForm({
  feePlans,
  students,
  organizationId,
}: {
  feePlans: FeePlan[];
  students: Student[];
  organizationId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    studentId: "",
    amount: "",
    method: "cash",
    reference: "",
    feePlanId: "",
    notes: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/school/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId,
          studentId: form.studentId,
          amount: Number(form.amount),
          method: form.method,
          reference: form.reference || null,
          feePlanId: form.feePlanId || null,
          notes: form.notes || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed");
        return;
      }
      setForm({ studentId: "", amount: "", method: "cash", reference: "", feePlanId: "", notes: "" });
      router.refresh();
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-4">
      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <div>
        <label className="block text-sm font-medium text-slate-700">Student *</label>
        <select
          value={form.studentId}
          onChange={(e) => setForm((f) => ({ ...f, studentId: e.target.value }))}
          className="input-field mt-1"
          required
        >
          <option value="">Select</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Amount (₹) *</label>
        <input
          type="number"
          min={0}
          step={0.01}
          value={form.amount}
          onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
          className="input-field mt-1"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Method *</label>
        <select
          value={form.method}
          onChange={(e) => setForm((f) => ({ ...f, method: e.target.value }))}
          className="input-field mt-1"
        >
          <option value="cash">Cash</option>
          <option value="upi">UPI</option>
          <option value="card">Card</option>
          <option value="bank_transfer">Bank transfer</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Reference</label>
        <input
          value={form.reference}
          onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))}
          className="input-field mt-1"
          placeholder="Transaction ID"
        />
      </div>
      {feePlans.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-slate-700">Fee plan</label>
          <select
            value={form.feePlanId}
            onChange={(e) => setForm((f) => ({ ...f, feePlanId: e.target.value }))}
            className="input-field mt-1"
          >
            <option value="">—</option>
            {feePlans.map((p) => (
              <option key={p.id} value={p.id}>{p.name} (₹{p.amount})</option>
            ))}
          </select>
        </div>
      )}
      <div>
        <label className="block text-sm font-medium text-slate-700">Notes</label>
        <input
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          className="input-field mt-1"
        />
      </div>
      <button type="submit" disabled={loading} className="btn-primary">
        {loading ? "Recording..." : "Record payment"}
      </button>
    </form>
  );
}
