"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

type Class = { id: string; name: string };
type Student = {
  id: string;
  rollNo: string | null;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  dateOfBirth: Date | null;
  gender: string | null;
  address: string | null;
  guardianName: string | null;
  guardianPhone: string | null;
  classId: string | null;
  image: string | null;
  status: string;
};

export function StudentForm({
  organizationId,
  classes,
  student,
}: {
  organizationId: string;
  classes: Class[];
  student?: Student | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    rollNo: student?.rollNo ?? "",
    firstName: student?.firstName ?? "",
    lastName: student?.lastName ?? "",
    email: student?.email ?? "",
    phone: student?.phone ?? "",
    dateOfBirth: student?.dateOfBirth ? new Date(student.dateOfBirth).toISOString().slice(0, 10) : "",
    gender: student?.gender ?? "",
    address: student?.address ?? "",
    guardianName: student?.guardianName ?? "",
    guardianPhone: student?.guardianPhone ?? "",
    classId: student?.classId ?? "",
    status: student?.status ?? "active",
  });

  const url = student ? `/api/school/students/${student.id}` : "/api/school/students";
  const method = "POST";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, organizationId, classId: form.classId || null }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed");
        return;
      }
      router.push("/school/students");
      router.refresh();
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>, sid: string) {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.set("file", file);
    formData.set("type", "student");
    formData.set("studentId", sid);
    const res = await fetch("/api/school/upload", { method: "POST", body: formData });
    if (res.ok) router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {student && (
        <div>
          <label className="block text-sm font-medium text-slate-700">Student photo</label>
          <div className="mt-2 flex items-center gap-4">
            {student.image ? (
              <div className="relative h-20 w-20 overflow-hidden rounded-lg border bg-slate-100">
                <Image src={student.image} alt="" fill className="object-cover" unoptimized />
              </div>
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-lg border-2 border-dashed border-slate-300 text-slate-400 text-xs">No photo</div>
            )}
            <label className="cursor-pointer rounded-lg bg-slate-100 px-3 py-2 text-sm hover:bg-slate-200">
              {student.image ? "Change" : "Upload"}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageChange(e, student.id)} />
            </label>
          </div>
        </div>
      )}
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
          <label className="block text-sm font-medium text-slate-700">Roll no</label>
          <input value={form.rollNo} onChange={(e) => setForm((f) => ({ ...f, rollNo: e.target.value }))} className="input-field mt-1" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Class</label>
          <select value={form.classId} onChange={(e) => setForm((f) => ({ ...f, classId: e.target.value }))} className="input-field mt-1">
            <option value="">—</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-slate-700">Email</label>
          <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className="input-field mt-1" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Phone</label>
          <input type="tel" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className="input-field mt-1" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-slate-700">Date of birth</label>
          <input type="date" value={form.dateOfBirth} onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: e.target.value }))} className="input-field mt-1" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Gender</label>
          <select value={form.gender} onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))} className="input-field mt-1">
            <option value="">—</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Address</label>
        <input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} className="input-field mt-1" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-slate-700">Guardian name</label>
          <input value={form.guardianName} onChange={(e) => setForm((f) => ({ ...f, guardianName: e.target.value }))} className="input-field mt-1" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Guardian phone</label>
          <input type="tel" value={form.guardianPhone} onChange={(e) => setForm((f) => ({ ...f, guardianPhone: e.target.value }))} className="input-field mt-1" />
        </div>
      </div>
      {student && (
        <div>
          <label className="block text-sm font-medium text-slate-700">Status</label>
          <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} className="input-field mt-1">
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="graduated">Graduated</option>
          </select>
        </div>
      )}
      <div className="flex gap-2 pt-2">
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? "Saving..." : student ? "Update" : "Create"}
        </button>
        <button type="button" onClick={() => router.back()} className="btn-secondary">
          Cancel
        </button>
      </div>
    </form>
  );
}
