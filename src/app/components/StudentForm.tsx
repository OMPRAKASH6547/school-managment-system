"use client";

import { useMemo, useState } from "react";
import { SearchablePaginatedSelect, type SearchableSelectItem } from "@/app/components/SearchablePaginatedSelect";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { LIMITS } from "@/lib/field-validation";

type Class = { id: string; name: string };
type Student = {
  id: string;
  rollNo: string | null;
  aadhaarNo: string | null;
  bloodGroup: string | null;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  dateOfBirth: Date | null;
  gender: string | null;
  address: string | null;
  village: string | null;
  policeStation: string | null;
  postOffice: string | null;
  district: string | null;
  pinCode: string | null;
  state: string | null;
  fatherName: string | null;
  motherName: string | null;
  motherPhone: string | null;
  category: string | null;
  guardianName: string | null;
  guardianPhone: string | null;
  classId: string | null;
  image: string | null;
  status: string;
};

type PaymentLine = { key: string; label: string; amount: string };

function newPaymentLine(partial?: Partial<Pick<PaymentLine, "label">>): PaymentLine {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    label: partial?.label ?? "",
    amount: "",
  };
}

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
  const [paymentLines, setPaymentLines] = useState<PaymentLine[]>(() => [
    newPaymentLine({ label: "Admission fee" }),
  ]);
  const [form, setForm] = useState({
    aadhaarNo: student?.aadhaarNo ?? "",
    bloodGroup: student?.bloodGroup ?? "",
    firstName: student?.firstName ?? "",
    lastName: student?.lastName ?? "",
    email: student?.email ?? "",
    phone: student?.phone ?? "",
    dateOfBirth: student?.dateOfBirth ? new Date(student.dateOfBirth).toISOString().slice(0, 10) : "",
    gender: student?.gender ?? "",
    address: student?.address ?? "",
    village: student?.village ?? "",
    policeStation: student?.policeStation ?? "",
    postOffice: student?.postOffice ?? "",
    district: student?.district ?? "",
    pinCode: student?.pinCode ?? "",
    state: student?.state ?? "",
    fatherName: student?.fatherName ?? "",
    motherName: student?.motherName ?? "",
    motherPhone: student?.motherPhone ?? "",
    category: student?.category ?? "",
    guardianName: student?.guardianName ?? "",
    guardianPhone: student?.guardianPhone ?? "",
    classId: student?.classId ?? "",
    status: student?.status ?? "active",
    paymentMethod: "cash",
    paymentReference: "",
  });

  const bloodItems = useMemo<SearchableSelectItem[]>(
    () =>
      ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((g) => ({ value: g, label: g })),
    [],
  );
  const classItems = useMemo(() => classes.map((c) => ({ value: c.id, label: c.name })), [classes]);
  const genderItems = useMemo<SearchableSelectItem[]>(
    () => [
      { value: "male", label: "Male" },
      { value: "female", label: "Female" },
      { value: "other", label: "Other" },
    ],
    [],
  );
  const paymentMethodItems = useMemo<SearchableSelectItem[]>(
    () => [
      { value: "cash", label: "Cash" },
      { value: "online", label: "Online" },
    ],
    [],
  );
  const statusItems = useMemo<SearchableSelectItem[]>(
    () => [
      { value: "active", label: "Active" },
      { value: "inactive", label: "Inactive" },
      { value: "graduated", label: "Graduated" },
    ],
    [],
  );
  const categoryItems = useMemo<SearchableSelectItem[]>(
    () => [
      { value: "", label: "—" },
      { value: "general", label: "General" },
      { value: "obc", label: "OBC" },
      { value: "sc", label: "SC" },
      { value: "st", label: "ST" },
      { value: "ews", label: "EWS" },
      { value: "other", label: "Other" },
    ],
    [],
  );

  const url = student ? `/api/school/students/${student.id}` : "/api/school/students";
  const method = "POST";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      let admissionLineItems: { label: string; amount: number }[] | undefined;
      if (!student) {
        admissionLineItems = paymentLines
          .map((row) => ({
            label: row.label.trim(),
            amount: Number(row.amount),
          }))
          .filter((row) => row.label.length > 0 && Number.isFinite(row.amount) && row.amount > 0);
        if (admissionLineItems.length === 0) {
          setError("Add at least one payment row with a description and a positive amount.");
          setLoading(false);
          return;
        }
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          organizationId,
          classId: form.classId || null,
          ...(admissionLineItems
            ? {
                admissionLineItems,
                paymentMethod: form.paymentMethod,
                paymentReference: form.paymentReference,
              }
            : {}),
        }),
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

  const paymentTotal = useMemo(() => {
    return paymentLines.reduce((sum, row) => {
      const n = Number(row.amount);
      return sum + (Number.isFinite(n) && n > 0 ? n : 0);
    }, 0);
  }, [paymentLines]);

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
          <input
            value={form.firstName}
            onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
            className="input-field mt-1"
            maxLength={LIMITS.personName}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Last name *</label>
          <input
            value={form.lastName}
            onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
            className="input-field mt-1"
            maxLength={LIMITS.personName}
            required
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-slate-700">Roll no</label>
          <input
            value={student?.rollNo ?? "Auto generated on save"}
            readOnly
            className="input-field mt-1 bg-slate-50 text-slate-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Aadhaar no *</label>
          <input
            value={form.aadhaarNo}
            onChange={(e) => setForm((f) => ({ ...f, aadhaarNo: e.target.value.replace(/\D/g, "").slice(0, 12) }))}
            className="input-field mt-1"
            inputMode="numeric"
            autoComplete="off"
            maxLength={12}
            pattern="\d{12}"
            title="12-digit Aadhaar"
            required
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-slate-700">Blood group *</label>
          <SearchablePaginatedSelect
            items={bloodItems}
            value={form.bloodGroup}
            onChange={(v) => setForm((f) => ({ ...f, bloodGroup: v }))}
            emptyLabel="—"
            required
            className="mt-1"
            aria-label="Blood group"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Class</label>
          <SearchablePaginatedSelect
            items={classItems}
            value={form.classId}
            onChange={(v) => setForm((f) => ({ ...f, classId: v }))}
            emptyLabel="—"
            className="mt-1"
            aria-label="Class"
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-slate-700">Category</label>
          <SearchablePaginatedSelect
            items={categoryItems}
            value={form.category}
            onChange={(v) => setForm((f) => ({ ...f, category: v }))}
            emptyLabel="—"
            className="mt-1"
            aria-label="Category"
          />
        </div>
        <div />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-slate-700">Email</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            className="input-field mt-1"
            maxLength={LIMITS.email}
            autoComplete="email"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Phone</label>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            className="input-field mt-1"
            maxLength={LIMITS.phoneDisplay}
            inputMode="tel"
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-slate-700">Date of birth</label>
          <input type="date" value={form.dateOfBirth} onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: e.target.value }))} className="input-field mt-1" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Gender</label>
          <SearchablePaginatedSelect
            items={genderItems}
            value={form.gender}
            onChange={(v) => setForm((f) => ({ ...f, gender: v }))}
            emptyLabel="—"
            className="mt-1"
            aria-label="Gender"
          />
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
        <p className="text-sm font-semibold text-slate-800">Address</p>
        <p className="mt-0.5 text-xs text-slate-500">Street or full line; locality fields below are optional.</p>
        <div className="mt-3 space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-700">Street / address line</label>
            <input
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              className="input-field mt-1"
              maxLength={LIMITS.longText}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700">Village</label>
              <input
                value={form.village}
                onChange={(e) => setForm((f) => ({ ...f, village: e.target.value }))}
                className="input-field mt-1"
                maxLength={LIMITS.shortLabel}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Police station (PS)</label>
              <input
                value={form.policeStation}
                onChange={(e) => setForm((f) => ({ ...f, policeStation: e.target.value }))}
                className="input-field mt-1"
                maxLength={LIMITS.shortLabel}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Post office</label>
              <input
                value={form.postOffice}
                onChange={(e) => setForm((f) => ({ ...f, postOffice: e.target.value }))}
                className="input-field mt-1"
                maxLength={LIMITS.shortLabel}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">District</label>
              <input
                value={form.district}
                onChange={(e) => setForm((f) => ({ ...f, district: e.target.value }))}
                className="input-field mt-1"
                maxLength={LIMITS.shortLabel}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">PIN code</label>
              <input
                value={form.pinCode}
                onChange={(e) => setForm((f) => ({ ...f, pinCode: e.target.value.replace(/\D/g, "").slice(0, 6) }))}
                className="input-field mt-1"
                inputMode="numeric"
                maxLength={6}
                pattern="\d{6}"
                title="6-digit PIN"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">State</label>
              <input
                value={form.state}
                onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
                className="input-field mt-1"
                maxLength={LIMITS.shortLabel}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
        <p className="text-sm font-semibold text-slate-800">Parents & guardian</p>
        <p className="mt-0.5 text-xs text-slate-500">Use guardian for local guardian or primary contact if different from parents.</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-700">Father&apos;s name</label>
            <input
              value={form.fatherName}
              onChange={(e) => setForm((f) => ({ ...f, fatherName: e.target.value }))}
              className="input-field mt-1"
              maxLength={LIMITS.personName}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Mother&apos;s name</label>
            <input
              value={form.motherName}
              onChange={(e) => setForm((f) => ({ ...f, motherName: e.target.value }))}
              className="input-field mt-1"
              maxLength={LIMITS.personName}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Mother&apos;s phone</label>
            <input
              type="tel"
              value={form.motherPhone}
              onChange={(e) => setForm((f) => ({ ...f, motherPhone: e.target.value }))}
              className="input-field mt-1"
              maxLength={LIMITS.phoneDisplay}
              inputMode="tel"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Guardian name</label>
            <input
              value={form.guardianName}
              onChange={(e) => setForm((f) => ({ ...f, guardianName: e.target.value }))}
              className="input-field mt-1"
              maxLength={LIMITS.personName}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700">Guardian phone</label>
            <input
              type="tel"
              value={form.guardianPhone}
              onChange={(e) => setForm((f) => ({ ...f, guardianPhone: e.target.value }))}
              className="input-field mt-1"
              maxLength={LIMITS.phoneDisplay}
              inputMode="tel"
            />
          </div>
        </div>
      </div>

      {!student && (
        <div className="rounded-lg border border-slate-200 p-4">
          <p className="font-medium text-slate-800">Admission payment</p>
          <p className="mt-1 text-xs text-slate-500">
            Add one or more lines (e.g. admission, registration, security). Total is verified in Payment Verification.
          </p>
          <div className="mt-3 space-y-3">
            {paymentLines.map((row, index) => (
              <div key={row.key} className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <div className="min-w-0 flex-1">
                  <label className="block text-sm font-medium text-slate-700">Description</label>
                  <input
                    value={row.label}
                    onChange={(e) => {
                      const v = e.target.value;
                      setPaymentLines((lines) => lines.map((l) => (l.key === row.key ? { ...l, label: v } : l)));
                    }}
                    className="input-field mt-1"
                    placeholder="e.g. Admission fee"
                    maxLength={LIMITS.admissionFeeLabel}
                    required={index === 0}
                  />
                </div>
                <div className="w-full sm:w-36">
                  <label className="block text-sm font-medium text-slate-700">Amount (INR)</label>
                  <input
                    type="number"
                    min={0}
                    max={1_000_000_000}
                    step="0.01"
                    value={row.amount}
                    onChange={(e) => {
                      const v = e.target.value;
                      setPaymentLines((lines) => lines.map((l) => (l.key === row.key ? { ...l, amount: v } : l)));
                    }}
                    className="input-field mt-1"
                    required={index === 0}
                  />
                </div>
                {paymentLines.length > 1 ? (
                  <div className="pb-0.5 sm:pb-1">
                    <button
                      type="button"
                      className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-700 hover:bg-red-50"
                      onClick={() => setPaymentLines((lines) => lines.filter((l) => l.key !== row.key))}
                    >
                      Remove
                    </button>
                  </div>
                ) : null}
              </div>
            ))}
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                className="btn-secondary text-sm"
                onClick={() => setPaymentLines((lines) => [...lines, newPaymentLine({ label: "" })])}
              >
                Add payment line
              </button>
              <p className="text-sm font-medium text-slate-700">
                Total: <span className="text-primary-600">INR {paymentTotal.toFixed(2)}</span>
              </p>
            </div>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700">Payment mode</label>
              <SearchablePaginatedSelect
                items={paymentMethodItems}
                value={form.paymentMethod}
                onChange={(v) => setForm((f) => ({ ...f, paymentMethod: v }))}
                emptyLabel="Payment mode"
                required
                className="mt-1"
                aria-label="Payment mode"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Reference</label>
              <input
                value={form.paymentReference}
                onChange={(e) => setForm((f) => ({ ...f, paymentReference: e.target.value }))}
                className="input-field mt-1"
                placeholder="Txn ID / UTR / note"
                maxLength={LIMITS.reference}
              />
            </div>
          </div>
        </div>
      )}
      {student && (
        <div>
          <label className="block text-sm font-medium text-slate-700">Status</label>
          <SearchablePaginatedSelect
            items={statusItems}
            value={form.status}
            onChange={(v) => setForm((f) => ({ ...f, status: v }))}
            emptyLabel="Status"
            required
            className="mt-1"
            aria-label="Status"
          />
        </div>
      )}
      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={loading}
          aria-busy={loading}
          className={`btn-primary ${loading ? "btn-loading" : ""}`}
        >
          {loading ? "Saving..." : student ? "Update" : "Create"}
        </button>
        <button type="button" onClick={() => router.back()} className="btn-secondary">
          Cancel
        </button>
      </div>
    </form>
  );
}
