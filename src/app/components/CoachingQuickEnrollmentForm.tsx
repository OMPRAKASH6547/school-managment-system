"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { SearchablePaginatedSelect } from "@/app/components/SearchablePaginatedSelect";

type ClassOption = { id: string; name: string };

export function CoachingQuickEnrollmentForm({
  organizationId,
  classes,
}: {
  organizationId: string;
  classes: ClassOption[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    classId: "",
    admissionAmount: "1000",
    paymentMethod: "cash",
  });

  const classItems = useMemo(
    () => classes.map((c) => ({ value: c.id, label: c.name })),
    [classes]
  );

  async function createStudent(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const amount = Number(form.admissionAmount);
      const phoneDigits = form.phone.replace(/\D/g, "");
      const safePhone = phoneDigits.length >= 10 && phoneDigits.length <= 15 ? form.phone : null;
      const res = await fetch("/api/school/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId,
          firstName: form.firstName,
          lastName: form.lastName,
          phone: safePhone,
          classId: form.classId || null,
          dateOfBirth: "2010-01-01",
          bloodGroup: "O+",
          gender: null,
          status: "active",
          aadhaarNo: null,
          email: null,
          address: null,
          village: null,
          policeStation: null,
          postOffice: null,
          district: null,
          pinCode: null,
          state: null,
          fatherName: null,
          motherName: null,
          motherPhone: null,
          category: null,
          guardianName: null,
          guardianPhone: safePhone,
          admissionLineItems: [
            {
              label: "Admission fee",
              amount: Number.isFinite(amount) && amount > 0 ? amount : 1000,
            },
          ],
          paymentMethod: form.paymentMethod,
          paymentReference: null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data as { error?: string }).error || "Failed to enroll student");
        return;
      }
      setForm((prev) => ({ ...prev, firstName: "", lastName: "", phone: "" }));
      router.refresh();
    } catch {
      setError("Failed to enroll student");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={createStudent} className="space-y-3">
      {error ? <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          required
          value={form.firstName}
          onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
          placeholder="First name"
          className="input-field"
        />
        <input
          required
          value={form.lastName}
          onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
          placeholder="Last name"
          className="input-field"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <input
          value={form.phone}
          onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          placeholder="Phone (optional)"
          className="input-field"
        />
        <SearchablePaginatedSelect
          items={classItems}
          value={form.classId}
          onChange={(value) => setForm((f) => ({ ...f, classId: value }))}
          emptyLabel="Select batch"
          aria-label="Select batch"
        />
        <input
          type="number"
          min={1}
          value={form.admissionAmount}
          onChange={(e) => setForm((f) => ({ ...f, admissionAmount: e.target.value }))}
          placeholder="Admission fee"
          className="input-field"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <SearchablePaginatedSelect
          items={[
            { value: "cash", label: "Cash" },
            { value: "online", label: "Online" },
          ]}
          value={form.paymentMethod}
          onChange={(value) => setForm((f) => ({ ...f, paymentMethod: value }))}
          emptyLabel="Payment mode"
          aria-label="Payment mode"
          className="min-w-[160px]"
        />
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? "Enrolling..." : "Quick Enroll"}
        </button>
      </div>
      <p className="text-xs text-slate-500">
        Defaults: blood group O+, DOB 2010-01-01. You can update full details later from Student profile.
      </p>
    </form>
  );
}
