"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Class = { id: string; name: string };

export function CreateFeePlanForm({
  classes,
  organizationId,
  initialPayerType = "student",
}: {
  classes: Class[];
  organizationId: string;
  initialPayerType?: "student" | "staff";
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    amount: "",
    frequency: "monthly" as "one_time" | "monthly" | "quarterly" | "yearly",
    payerType: initialPayerType as "student" | "staff",
    classId: "",
    dueDay: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/school/fee-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId,
          name: form.name,
          amount: Number(form.amount),
          frequency: form.frequency,
          payerType: form.payerType,
          classId: form.classId || null,
          dueDay: form.dueDay ? Number(form.dueDay) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed");
        return;
      }
      setForm({
        name: "",
        amount: "",
        frequency: "monthly",
        payerType: initialPayerType,
        classId: "",
        dueDay: "",
      });
      router.refresh();
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium text-slate-600">Name</label>
          <input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="input-field mt-1 text-sm"
            placeholder="e.g. Monthly tuition"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">Amount (₹)</label>
          <input
            type="number"
            min={0}
            step={0.01}
            value={form.amount}
            onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
            className="input-field mt-1 text-sm"
            required
          />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium text-slate-600">Plan for</label>
          <select
            value={form.payerType}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                payerType: e.target.value as "student" | "staff",
                classId: e.target.value === "staff" ? "" : f.classId,
              }))
            }
            className="input-field mt-1 text-sm"
          >
            <option value="student">Student</option>
            <option value="staff">Teacher / Staff</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">Frequency</label>
          <select
            value={form.frequency}
            onChange={(e) => setForm((f) => ({ ...f, frequency: e.target.value as typeof form.frequency }))}
            className="input-field mt-1 text-sm"
          >
            <option value="one_time">One time</option>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">Due day (1–31)</label>
          <input
            type="number"
            min={1}
            max={31}
            value={form.dueDay}
            onChange={(e) => setForm((f) => ({ ...f, dueDay: e.target.value }))}
            className="input-field mt-1 text-sm"
            placeholder="Optional"
          />
        </div>
      </div>
      {form.payerType === "student" && (
        <div>
          <label className="block text-xs font-medium text-slate-600">Class (optional)</label>
          <select
            value={form.classId}
            onChange={(e) => setForm((f) => ({ ...f, classId: e.target.value }))}
            className="input-field mt-1 text-sm"
          >
            <option value="">All classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      )}
      <button type="submit" disabled={loading} className="btn-primary text-sm">
        {loading ? "Creating..." : "Create fee plan"}
      </button>
    </form>
  );
}
