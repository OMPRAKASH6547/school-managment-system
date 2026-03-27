"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Staff = {
  id: string;
  branchId: string | null;
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

type ModuleKey =
  | "students"
  | "staff"
  | "classes"
  | "attendance"
  | "examinations"
  | "fees"
  | "library"
  | "books"
  | "transport"
  | "hostel";

type ModuleAccessMap = Record<ModuleKey, { view: boolean; add: boolean; edit: boolean; delete: boolean }>;

const MODULES: { key: ModuleKey; label: string }[] = [
  { key: "students", label: "Students" },
  { key: "staff", label: "Staff" },
  { key: "classes", label: "Classes" },
  { key: "attendance", label: "Attendance" },
  { key: "examinations", label: "Examinations" },
  { key: "fees", label: "Fees" },
  { key: "library", label: "Library" },
  { key: "books", label: "Books" },
  { key: "transport", label: "Transport" },
  { key: "hostel", label: "Hostel" },
];

function blankAccess(): ModuleAccessMap {
  return {
    students: { view: false, add: false, edit: false, delete: false },
    staff: { view: false, add: false, edit: false, delete: false },
    classes: { view: false, add: false, edit: false, delete: false },
    attendance: { view: false, add: false, edit: false, delete: false },
    examinations: { view: false, add: false, edit: false, delete: false },
    fees: { view: false, add: false, edit: false, delete: false },
    library: { view: false, add: false, edit: false, delete: false },
    books: { view: false, add: false, edit: false, delete: false },
    transport: { view: false, add: false, edit: false, delete: false },
    hostel: { view: false, add: false, edit: false, delete: false },
  };
}

function defaultAccessByRole(role: string): ModuleAccessMap {
  const all = blankAccess();
  const setAll = () => {
    for (const m of MODULES) all[m.key] = { view: true, add: true, edit: true, delete: true };
  };
  if (role === "admin" || role === "school_admin") setAll();
  if (role === "teacher") {
    all.attendance = { view: true, add: true, edit: true, delete: false };
    all.examinations = { view: true, add: true, edit: true, delete: false };
    all.books = { view: true, add: true, edit: false, delete: false };
    all.transport = { view: true, add: true, edit: false, delete: false };
  }
  if (role === "accountant") {
    all.fees = { view: true, add: true, edit: true, delete: false };
    all.books = { view: true, add: true, edit: true, delete: false };
  }
  if (role === "staff") {
    all.attendance = { view: true, add: true, edit: false, delete: false };
    all.books = { view: true, add: true, edit: false, delete: false };
    all.transport = { view: true, add: true, edit: false, delete: false };
  }
  return all;
}

function ChipsMultiSelect({
  options,
  value,
  onChange,
  placeholder,
}: {
  options: { value: string; label: string }[];
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDocumentMouseDown(e: MouseEvent) {
      const root = rootRef.current;
      if (!root) return;
      const target = e.target as Node | null;
      if (target && !root.contains(target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocumentMouseDown);
    return () => document.removeEventListener("mousedown", onDocumentMouseDown);
  }, []);

  const normalizedQuery = query.trim().toLowerCase();
  const filteredOptions = normalizedQuery
    ? options.filter((o) => o.label.toLowerCase().includes(normalizedQuery))
    : options;
  const labelByValue = new Map(options.map((o) => [o.value, o.label]));

  return (
    <div ref={rootRef} className="relative w-full" onClick={() => setOpen(true)}>
      <div className="flex min-h-20 w-full flex-wrap items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 shadow-sm focus-within:border-primary-500 focus-within:ring-1 focus-within:ring-primary-500">
        {value.map((v) => (
          <span key={v} className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-800">
            {labelByValue.get(v) ?? v}
            <button
              type="button"
              className="rounded p-0.5 text-slate-500 hover:bg-slate-200"
              aria-label={`Remove ${v}`}
              onClick={(e) => {
                e.stopPropagation();
                onChange(value.filter((x) => x !== v));
              }}
            >
              x
            </button>
          </span>
        ))}

        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={value.length === 0 ? placeholder ?? "Select..." : "Search..."}
          className="flex-1 min-w-[120px] bg-transparent text-sm outline-none"
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
            if (e.key === "Enter") e.preventDefault();
          }}
        />

        {value.length > 0 && (
          <button
            type="button"
            className="ml-auto rounded p-1 text-slate-500 hover:bg-slate-100"
            aria-label="Clear all selected"
            onClick={(e) => {
              e.stopPropagation();
              onChange([]);
              setQuery("");
              setOpen(false);
            }}
          >
            x
          </button>
        )}

        <span className="ml-auto text-slate-400" aria-hidden>
          {open ? "▲" : "▼"}
        </span>
      </div>

      {open && (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="max-h-60 overflow-auto">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-sm text-slate-500">No options found.</div>
            ) : (
              filteredOptions.map((opt) => {
                const checked = value.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    className="flex w-full items-center justify-start gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (checked) onChange(value.filter((x) => x !== opt.value));
                      else onChange([...value, opt.value]);
                      setOpen(true);
                    }}
                  >
                    <input type="checkbox" checked={checked} readOnly />
                    <span className={checked ? "font-medium text-slate-900" : "text-slate-700"}>{opt.label}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function StaffForm({
  staff,
  branches = [],
  initialModuleAccess,
  classes = [],
  initialTeacherClassIds = [],
  initialTeacherClassSubjects = {},
  initialGeneratedLoginPassword = null,
}: {
  staff?: Staff | null;
  branches?: { id: string; name: string; branchCode: string }[];
  initialModuleAccess?: Partial<ModuleAccessMap> | null;
  classes?: { id: string; name: string; branchId: string | null }[];
  initialTeacherClassIds?: string[];
  initialTeacherClassSubjects?: Record<string, string>;
  initialGeneratedLoginPassword?: string | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    employeeId: staff?.employeeId ?? "",
    branchId: staff?.branchId ?? branches[0]?.id ?? "",
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
  const [moduleAccess, setModuleAccess] = useState<ModuleAccessMap>(
    initialModuleAccess
      ? ({ ...blankAccess(), ...initialModuleAccess } as ModuleAccessMap)
      : defaultAccessByRole(staff?.role ?? "teacher")
  );
  const [teacherClassIds, setTeacherClassIds] = useState<string[]>(initialTeacherClassIds);
  const defaultSubjectOptions = ["Math", "Science", "English", "Hindi", "SST", "Computer"];
  const [subjectOptions, setSubjectOptions] = useState<string[]>(defaultSubjectOptions);
  const [newSubject, setNewSubject] = useState("");
  const [teacherClassSubjects, setTeacherClassSubjects] = useState<Record<string, string[]>>(() => {
    const next: Record<string, string[]> = {};
    for (const [classId, v] of Object.entries(initialTeacherClassSubjects)) {
      next[classId] = v.split(",").map((s) => s.trim()).filter(Boolean);
    }
    return next;
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
          moduleAccess,
          classIds: form.role === "teacher" ? teacherClassIds : [],
          classSubjects:
            form.role === "teacher"
              ? Object.fromEntries(
                  Object.entries(teacherClassSubjects).map(([classId, values]) => [classId, values.join(", ")])
                )
              : {},
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed");
        return;
      }
      if (!staff && data.password) {
        alert(
          `Login password for ${data.email ?? form.email}: ${data.password}\nEmployee ID: ${data.employeeId ?? "Auto generated"}`
        );
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
          <label className="block text-sm font-medium text-slate-700">Branch *</label>
          <select
            value={form.branchId}
            onChange={(e) => setForm((f) => ({ ...f, branchId: e.target.value }))}
            className="input-field mt-1"
            required
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.branchCode})
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-slate-700">Role *</label>
          <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} className="input-field mt-1" required>
            <option value="teacher">Teacher</option>
            <option value="admin">Admin</option>
            <option value="accountant">Accountant</option>
            <option value="staff">Staff</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Email *</label>
          <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className="input-field mt-1" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Phone</label>
          <input type="tel" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className="input-field mt-1" />
        </div>
      </div>
      {form.role === "teacher" && (
        <div className="rounded-lg border border-slate-200 p-3">
          <p className="text-sm font-medium text-slate-800">Teacher class assignment</p>
          <p className="mt-1 text-xs text-slate-500">Select multiple classes and subjects.</p>
          <div className="mt-3">
            <label className="block text-sm font-medium text-slate-700">Add subject option</label>
            <div className="mt-1 flex gap-2">
              <input
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                className="input-field flex-1"
                placeholder="e.g. Biology"
              />
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  const v = newSubject.trim();
                  if (!v) return;
                  if (!subjectOptions.includes(v)) setSubjectOptions((prev) => [...prev, v]);
                  setNewSubject("");
                }}
              >
                Add subject
              </button>
            </div>
          </div>
          <div className="mt-3">
            <label className="block text-sm font-medium text-slate-700">Classes *</label>
            <div className="mt-1">
              <ChipsMultiSelect
                options={classes
                  .filter((c) => !form.branchId || c.branchId === form.branchId)
                  .map((c) => ({ value: c.id, label: c.name }))}
                value={teacherClassIds}
                onChange={(values) => {
                  setTeacherClassIds(values);
                  setTeacherClassSubjects((prev) => {
                    const next: Record<string, string[]> = {};
                    for (const id of values) next[id] = prev[id] ?? [];
                    return next;
                  });
                }}
                placeholder="Select classes"
              />
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {teacherClassIds.length === 0 ? "Select at least one class." : `${teacherClassIds.length} class(es) selected`}
            </p>
          </div>
          {teacherClassIds.length > 0 && (
            <div className="mt-3 space-y-2">
              <label className="block text-sm font-medium text-slate-700">Subjects per class</label>
              {teacherClassIds.map((classId) => {
                const cls = classes.find((c) => c.id === classId);
                return (
                  <div key={classId}>
                    <label className="block text-xs text-slate-500">{cls?.name ?? classId}</label>
                    <div className="mt-1">
                      <ChipsMultiSelect
                        options={subjectOptions.map((s) => ({ value: s, label: s }))}
                        value={teacherClassSubjects[classId] ?? []}
                        onChange={(next) =>
                          setTeacherClassSubjects((prev) => ({
                            ...prev,
                            [classId]: next,
                          }))
                        }
                        placeholder="Select subjects"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      <div className="rounded-lg border border-slate-200 p-3">
        <p className="text-sm font-medium text-slate-800">Module permissions</p>
        <p className="mt-1 text-xs text-slate-500">Select View/Add/Edit/Delete access by module.</p>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="py-1 pr-4">Module</th>
                <th className="py-1 pr-3">View</th>
                <th className="py-1 pr-3">Add</th>
                <th className="py-1 pr-3">Edit</th>
                <th className="py-1">Delete</th>
              </tr>
            </thead>
            <tbody>
              {MODULES.map((m) => (
                <tr key={m.key} className="border-t border-slate-100">
                  <td className="py-2 pr-4 font-medium text-slate-700">{m.label}</td>
                  {(["view", "add", "edit", "delete"] as const).map((k) => (
                    <td key={k} className="py-2 pr-3">
                      <input
                        type="checkbox"
                        checked={moduleAccess[m.key][k]}
                        onChange={(e) =>
                          setModuleAccess((prev) => ({
                            ...prev,
                            [m.key]: { ...prev[m.key], [k]: e.target.checked },
                          }))
                        }
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
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
        <>
        <div>
          <label className="block text-sm font-medium text-slate-700">Login password (generated)</label>
          <input
            value={initialGeneratedLoginPassword ?? "Not available"}
            readOnly
            className="input-field mt-1 bg-slate-50"
          />
          <p className="mt-1 text-xs text-slate-500">
            This is the generated password shown during staff/teacher creation.
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Status</label>
          <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} className="input-field mt-1">
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        </>
      )}
      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={loading}
          aria-busy={loading}
          className={`btn-primary ${loading ? "btn-loading" : ""}`}
        >
          {loading ? "Saving..." : staff ? "Update" : "Create"}
        </button>
        <button type="button" onClick={() => router.back()} className="btn-secondary">
          Cancel
        </button>
      </div>
    </form>
  );
}
