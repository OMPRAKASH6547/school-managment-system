"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { SearchablePaginatedSelect, type SearchableSelectItem } from "@/app/components/SearchablePaginatedSelect";

type School = { id: string; name: string; type: string; branches: { id: string; name: string }[] };

export function StudentLoginForm() {
  const router = useRouter();
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(false);
  const [bootLoading, setBootLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    organizationId: "",
    branchId: "",
    rollNo: "",
    phone: "",
  });

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/public/schools-branches");
        const data = await res.json();
        if (!mounted) return;
        const rows: School[] = data.schools ?? [];
        setSchools(rows);
      } catch {
        if (!mounted) return;
        setError("Failed to load schools.");
      } finally {
        if (mounted) setBootLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const selectedSchool = useMemo(() => schools.find((s) => s.id === form.organizationId) ?? null, [schools, form.organizationId]);
  const schoolItems = useMemo<SearchableSelectItem[]>(
    () => schools.map((s) => ({ value: s.id, label: s.name })),
    [schools]
  );
  const branchItems = useMemo<SearchableSelectItem[]>(
    () => (selectedSchool?.branches ?? []).map((b) => ({ value: b.id, label: b.name })),
    [selectedSchool]
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/student-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Login failed");
        return;
      }
      router.push("/student");
      router.refresh();
    } catch {
      setError("Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error ? <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
      <div>
        <label className="block text-sm font-medium text-slate-700">Select school / coaching</label>
        <SearchablePaginatedSelect
          items={schoolItems}
          value={form.organizationId}
          onChange={(v) => setForm((f) => ({ ...f, organizationId: v, branchId: "" }))}
          emptyLabel={bootLoading ? "Loading..." : "Select school"}
          required
          disabled={bootLoading}
          className="mt-1"
          aria-label="Select school or coaching"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Select branch</label>
        <SearchablePaginatedSelect
          items={branchItems}
          value={form.branchId}
          onChange={(v) => setForm((f) => ({ ...f, branchId: v }))}
          emptyLabel={selectedSchool ? "Select branch" : "Select school first"}
          required
          disabled={!selectedSchool}
          className="mt-1"
          aria-label="Select branch"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Roll number</label>
        <input
          className="input-field mt-1"
          value={form.rollNo}
          onChange={(e) => setForm((f) => ({ ...f, rollNo: e.target.value }))}
          required
          placeholder="Enter roll number"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Phone verification</label>
        <input
          className="input-field mt-1"
          value={form.phone}
          onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          required
          placeholder="Enter registered phone number"
        />
      </div>

      <button className="btn-primary w-full" disabled={loading}>
        {loading ? "Verifying..." : "Student login"}
      </button>
      <p className="text-xs text-slate-500">
        Login is available for students added by the school administration.
      </p>
    </form>
  );
}
