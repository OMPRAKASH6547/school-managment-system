"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type FeePlan = { id: string; name: string; amount: number };
type Student = { id: string; firstName: string; lastName: string; rollNo?: string | null };
type Staff = { id: string; firstName: string; lastName: string; role: string; employeeId?: string | null };

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
  const [form, setForm] = useState({
    payerType: initialPayerType,
    studentId: "",
    staffId: "",
    rollNo: "",
    employeeId: "",
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
          payerType: form.payerType,
          studentId: form.payerType === "student" ? form.studentId : undefined,
          staffId: form.payerType === "staff" ? form.staffId : undefined,
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
      setForm({
        payerType: initialPayerType,
        studentId: "",
        staffId: "",
        rollNo: "",
        employeeId: "",
        amount: "",
        method: "cash",
        reference: "",
        feePlanId: "",
        notes: "",
      });
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
        <select
          value={form.payerType}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              payerType: e.target.value,
              studentId: "",
              staffId: "",
              rollNo: "",
              employeeId: "",
            }))
          }
          className="input-field mt-1"
          required
        >
          <option value="student">Student</option>
          <option value="staff">Teacher / Staff</option>
        </select>
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
            <select
              value={form.studentId}
              onChange={(e) => {
                const sid = e.target.value;
                const selected = students.find((s) => s.id === sid);
                setForm((f) => ({ ...f, studentId: sid, rollNo: selected?.rollNo ?? f.rollNo }));
              }}
              className="input-field mt-1"
              required
            >
              <option value="">Select</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.firstName} {s.lastName} {s.rollNo ? `(${s.rollNo})` : ""}
                </option>
              ))}
            </select>
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
            <select
              value={form.staffId}
              onChange={(e) => {
                const sid = e.target.value;
                const selected = staff.find((s) => s.id === sid);
                setForm((f) => ({ ...f, staffId: sid, employeeId: selected?.employeeId ?? f.employeeId }));
              }}
              className="input-field mt-1"
              required
            >
              <option value="">Select</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.firstName} {s.lastName} ({s.role}) {s.employeeId ? `- ${s.employeeId}` : ""}
                </option>
              ))}
            </select>
          </div>
        </>
      )}
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
            onChange={(e) => {
              const planId = e.target.value;
              const selected = feePlans.find((p) => p.id === planId);
              setForm((f) => ({ ...f, feePlanId: planId, amount: selected ? String(selected.amount) : f.amount }));
            }}
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
