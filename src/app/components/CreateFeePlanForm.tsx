"use client";

import { useMemo, useState } from "react";
import { SearchablePaginatedSelect, type SearchableSelectItem } from "@/app/components/SearchablePaginatedSelect";
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

  const payerItems = useMemo<SearchableSelectItem[]>(
    () => [
      { value: "student", label: "Student" },
      { value: "staff", label: "Teacher / Staff" },
    ],
    [],
  );
  const frequencyItems = useMemo<SearchableSelectItem[]>(
    () => [
      { value: "one_time", label: "One time" },
      { value: "monthly", label: "Monthly" },
      { value: "quarterly", label: "Quarterly" },
      { value: "yearly", label: "Yearly" },
    ],
    [],
  );
  const classItems = useMemo(() => classes.map((c) => ({ value: c.id, label: c.name })), [classes]);

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
          <SearchablePaginatedSelect
            items={payerItems}
            value={form.payerType}
            onChange={(v) =>
              setForm((f) => ({
                ...f,
                payerType: v as "student" | "staff",
                classId: v === "staff" ? "" : f.classId,
              }))
            }
            emptyLabel="Plan for"
            required
            className="mt-1"
            aria-label="Payer type"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">Frequency</label>
          <SearchablePaginatedSelect
            items={frequencyItems}
            value={form.frequency}
            onChange={(v) => setForm((f) => ({ ...f, frequency: v as typeof form.frequency }))}
            emptyLabel="Frequency"
            required
            className="mt-1"
            aria-label="Frequency"
          />
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
          <SearchablePaginatedSelect
            items={classItems}
            value={form.classId}
            onChange={(v) => setForm((f) => ({ ...f, classId: v }))}
            emptyLabel="All classes"
            className="mt-1"
            aria-label="Class"
          />
        </div>
      )}
      <button type="submit" disabled={loading} className="btn-primary text-sm">
        {loading ? "Creating..." : "Create fee plan"}
      </button>
    </form>
  );
}
