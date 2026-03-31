"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { SearchablePaginatedSelect, type SearchableSelectItem } from "@/app/components/SearchablePaginatedSelect";

type FeePlan = { id: string; name: string; amount: number };
type Student = { id: string; firstName: string; lastName: string; rollNo?: string | null };
type Staff = { id: string; firstName: string; lastName: string; role: string; employeeId?: string | null };

type FeeLine = {
  key: string;
  feePlanId: string;
  customLabel: string;
  amount: string;
};

function newLine(): FeeLine {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    feePlanId: "",
    customLabel: "",
    amount: "",
  };
}

export function RecordPaymentForm({
  feePlans,
  students,
  staff,
  organizationId,
  initialPayerType = "student",
}: {
  feePlans: FeePlan[];
  students: Student[];
  staff: Staff[];
  organizationId: string;
  initialPayerType?: "student" | "staff";
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const defaultMonth = () => new Date().toISOString().slice(0, 7);
  const [form, setForm] = useState({
    payerType: initialPayerType,
    studentId: "",
    staffId: "",
    rollNo: "",
    employeeId: "",
    feePeriodMonth: defaultMonth(),
    method: "cash",
    reference: "",
    notes: "",
  });
  const [lines, setLines] = useState<FeeLine[]>(() => [newLine()]);

  const totalPreview = useMemo(() => {
    let s = 0;
    for (const line of lines) {
      const n = Number(line.amount);
      if (Number.isFinite(n) && n > 0) s += n;
    }
    return s;
  }, [lines]);

  const payerTypeItems = useMemo<SearchableSelectItem[]>(
    () => [
      { value: "student", label: "Student" },
      { value: "staff", label: "Teacher / Staff" },
    ],
    [],
  );
  const studentItems = useMemo(
    () =>
      students.map((s) => ({
        value: s.id,
        label: `${s.firstName} ${s.lastName}${s.rollNo ? ` (${s.rollNo})` : ""}`,
      })),
    [students],
  );
  const staffItems = useMemo(
    () =>
      staff.map((s) => ({
        value: s.id,
        label: `${s.firstName} ${s.lastName} (${s.role})${s.employeeId ? ` — ${s.employeeId}` : ""}`,
      })),
    [staff],
  );
  const methodItems = useMemo<SearchableSelectItem[]>(
    () => [
      { value: "cash", label: "Cash" },
      { value: "upi", label: "UPI" },
      { value: "card", label: "Card" },
      { value: "bank_transfer", label: "Bank transfer" },
    ],
    [],
  );
  const feeLineItems = useMemo(() => {
    const rows: SearchableSelectItem[] = [
      ...feePlans.map((p) => ({ value: p.id, label: `${p.name} (₹${p.amount})` })),
      { value: "__custom__", label: "Custom fee…" },
    ];
    return rows;
  }, [feePlans]);

  function updateLine(key: string, patch: Partial<FeeLine>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function removeLine(key: string) {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((l) => l.key !== key)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const lineItems: { label: string; amount: number; feePlanId: string | null }[] = [];
    for (const line of lines) {
      const amt = Number(line.amount);
      if (!Number.isFinite(amt) || amt <= 0) continue;
      if (line.feePlanId === "__custom__") {
        const label = line.customLabel.trim() || "Fee";
        lineItems.push({ label, amount: amt, feePlanId: null });
      } else if (line.feePlanId) {
        const p = feePlans.find((x) => x.id === line.feePlanId);
        lineItems.push({
          label: (p?.name ?? "Fee").trim(),
          amount: amt,
          feePlanId: line.feePlanId,
        });
      } else {
        lineItems.push({ label: "Payment", amount: amt, feePlanId: null });
      }
    }
    if (lineItems.length === 0) {
      setError("Add at least one fee line with a positive amount.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/school/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId,
          payerType: form.payerType,
          studentId: form.payerType === "student" ? form.studentId : undefined,
          staffId: form.payerType === "staff" ? form.staffId : undefined,
          lineItems,
          method: form.method,
          reference: form.reference || null,
          notes: form.notes || null,
          feePeriodMonth: form.feePeriodMonth || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed");
        return;
      }
      setForm({
        payerType: initialPayerType,
        studentId: "",
        staffId: "",
        rollNo: "",
        employeeId: "",
        feePeriodMonth: defaultMonth(),
        method: "cash",
        reference: "",
        notes: "",
      });
      setLines([newLine()]);
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
        <label className="block text-sm font-medium text-slate-700">Payment for *</label>
        <SearchablePaginatedSelect
          items={payerTypeItems}
          value={form.payerType}
          onChange={(v) =>
            setForm((f) => ({
              ...f,
              payerType: v as "student" | "staff",
              studentId: "",
              staffId: "",
              rollNo: "",
              employeeId: "",
            }))
          }
          emptyLabel="Payment for *"
          required
          className="mt-1"
          aria-label="Payer type"
        />
      </div>
      {form.payerType === "student" ? (
        <>
          <div>
            <label className="block text-sm font-medium text-slate-700">Roll no</label>
            <input
              value={form.rollNo}
              onChange={(e) => {
                const v = e.target.value;
                const match = students.find((s) => (s.rollNo ?? "").toLowerCase() === v.trim().toLowerCase());
                setForm((f) => ({ ...f, rollNo: v, studentId: match?.id ?? f.studentId }));
              }}
              className="input-field mt-1"
              placeholder="Enter roll number"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Student *</label>
            <SearchablePaginatedSelect
              items={studentItems}
              value={form.studentId}
              onChange={(sid) => {
                const selected = students.find((s) => s.id === sid);
                setForm((f) => ({ ...f, studentId: sid, rollNo: selected?.rollNo ?? f.rollNo }));
              }}
              emptyLabel="Select"
              required
              className="mt-1"
              aria-label="Student"
            />
          </div>
        </>
      ) : (
        <>
          <div>
            <label className="block text-sm font-medium text-slate-700">Employee ID</label>
            <input
              value={form.employeeId}
              onChange={(e) => {
                const v = e.target.value;
                const match = staff.find((s) => (s.employeeId ?? "").toLowerCase() === v.trim().toLowerCase());
                setForm((f) => ({ ...f, employeeId: v, staffId: match?.id ?? f.staffId }));
              }}
              className="input-field mt-1"
              placeholder="Enter employee ID"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Teacher / Staff *</label>
            <SearchablePaginatedSelect
              items={staffItems}
              value={form.staffId}
              onChange={(sid) => {
                const selected = staff.find((s) => s.id === sid);
                setForm((f) => ({ ...f, staffId: sid, employeeId: selected?.employeeId ?? f.employeeId }));
              }}
              emptyLabel="Select"
              required
              className="mt-1"
              aria-label="Staff"
            />
          </div>
        </>
      )}
      <div>
        <label className="block text-sm font-medium text-slate-700">Fee for month *</label>
        <input
          type="month"
          value={form.feePeriodMonth}
          onChange={(e) => setForm((f) => ({ ...f, feePeriodMonth: e.target.value }))}
          className="input-field mt-1 max-w-[240px]"
          required
        />
        <p className="mt-1 text-xs text-slate-500">Which month this payment applies to (tuition, etc.).</p>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Method *</label>
        <SearchablePaginatedSelect
          items={methodItems}
          value={form.method}
          onChange={(v) => setForm((f) => ({ ...f, method: v }))}
          emptyLabel="Method *"
          required
          className="mt-1"
          aria-label="Payment method"
        />
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

      <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3">
        <div className="flex items-center justify-between gap-2">
          <label className="text-sm font-medium text-slate-800">Fee lines *</label>
          <button
            type="button"
            onClick={() => setLines((prev) => [...prev, newLine()])}
            className="text-sm font-medium text-primary-600 hover:underline"
          >
            + Add fee
          </button>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Pick a fee plan or add a custom fee. Amounts are summed for the total payment. After verification, the PDF receipt lists each line.
        </p>
        <div className="mt-3 space-y-2">
          {lines.map((line, idx) => (
            <div
              key={line.key}
              className="flex flex-col gap-2 rounded-md border border-slate-200 bg-white p-2 sm:flex-row sm:flex-wrap sm:items-end"
            >
              <div className="min-w-0 flex-1 sm:max-w-[220px]">
                <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Fee type</span>
                <SearchablePaginatedSelect
                  items={feeLineItems}
                  value={line.feePlanId === "__custom__" ? "__custom__" : line.feePlanId}
                  onChange={(v) => {
                    if (v === "__custom__") {
                      updateLine(line.key, { feePlanId: "__custom__", customLabel: line.customLabel });
                    } else if (v) {
                      const p = feePlans.find((x) => x.id === v);
                      updateLine(line.key, {
                        feePlanId: v,
                        customLabel: "",
                        amount: p ? String(p.amount) : line.amount,
                      });
                    } else {
                      updateLine(line.key, { feePlanId: "", customLabel: "", amount: "" });
                    }
                  }}
                  emptyLabel="— Select fee plan —"
                  className="mt-0.5 w-full"
                  aria-label="Fee plan"
                />
              </div>
              {line.feePlanId === "__custom__" && (
                <div className="min-w-0 flex-1 sm:max-w-[180px]">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Name</span>
                  <input
                    value={line.customLabel}
                    onChange={(e) => updateLine(line.key, { customLabel: e.target.value })}
                    className="input-field mt-0.5 w-full"
                    placeholder="e.g. Late fine, Sports"
                  />
                </div>
              )}
              <div className="w-full sm:w-32">
                <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Amount (₹)</span>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={line.amount}
                  onChange={(e) => updateLine(line.key, { amount: e.target.value })}
                  className="input-field mt-0.5 w-full"
                  required={idx === 0}
                />
              </div>
              {lines.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeLine(line.key)}
                  className="text-sm text-red-600 hover:underline sm:mb-2"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
        <p className="mt-3 text-right text-sm font-semibold text-slate-900">
          Total: ₹{totalPreview.toFixed(2)}
        </p>
      </div>

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
