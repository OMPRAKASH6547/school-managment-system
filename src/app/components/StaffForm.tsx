"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Staff = {
  id: string;
  employeeId: string | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  role: string;
  designation: string | null;
  joinDate: Date | null;
  salary: number | null;
  status: string;
};

export function StaffForm({ staff }: { staff?: Staff | null }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    employeeId: staff?.employeeId ?? "",
    firstName: staff?.firstName ?? "",
    lastName: staff?.lastName ?? "",
    email: staff?.email ?? "",
    phone: staff?.phone ?? "",
    role: staff?.role ?? "teacher",
    designation: staff?.designation ?? "",
    joinDate: staff?.joinDate ? new Date(staff.joinDate).toISOString().slice(0, 10) : "",
    salary: staff?.salary ?? "",
    status: staff?.status ?? "active",
  });

  const url = staff ? `/api/school/staff/${staff.id}` : "/api/school/staff";
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          salary: form.salary === "" ? null : Number(form.salary),
          joinDate: form.joinDate || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed");
        return;
      }
      if (!staff && data.password) {
        alert(`Login password for ${data.email ?? form.email}: ${data.password}`);
      }
      router.push("/school/staff");
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
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-slate-700">First name *</label>
          <input value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} className="input-field mt-1" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Last name *</label>
          <input value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} className="input-field mt-1" required />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-slate-700">Employee ID</label>
          <input value={form.employeeId} onChange={(e) => setForm((f) => ({ ...f, employeeId: e.target.value }))} className="input-field mt-1" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Role *</label>
          <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} className="input-field mt-1" required>
            <option value="teacher">Teacher</option>
            <option value="admin">Admin</option>
            <option value="accountant">Accountant</option>
            <option value="staff">Staff</option>
          </select>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-slate-700">Email *</label>
          <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className="input-field mt-1" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Phone</label>
          <input type="tel" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className="input-field mt-1" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Designation</label>
        <input value={form.designation} onChange={(e) => setForm((f) => ({ ...f, designation: e.target.value }))} className="input-field mt-1" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-slate-700">Join date</label>
          <input type="date" value={form.joinDate} onChange={(e) => setForm((f) => ({ ...f, joinDate: e.target.value }))} className="input-field mt-1" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Salary (₹)</label>
          <input type="number" min={0} step={0.01} value={form.salary} onChange={(e) => setForm((f) => ({ ...f, salary: e.target.value }))} className="input-field mt-1" />
        </div>
      </div>
      {staff && (
        <div>
          <label className="block text-sm font-medium text-slate-700">Status</label>
          <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} className="input-field mt-1">
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      )}
      <div className="flex gap-2 pt-2">
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? "Saving..." : staff ? "Update" : "Create"}
        </button>
        <button type="button" onClick={() => router.back()} className="btn-secondary">
          Cancel
        </button>
      </div>
    </form>
  );
}
