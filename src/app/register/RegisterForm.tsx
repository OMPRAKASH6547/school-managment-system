"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { SearchablePaginatedSelect, type SearchableSelectItem } from "@/app/components/SearchablePaginatedSelect";

export function RegisterForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    orgName: "",
    orgType: "school",
    phone: "",
    address: "",
    city: "",
  });

  const orgTypeItems = useMemo<SearchableSelectItem[]>(
    () => [
      { value: "school", label: "School" },
      { value: "coaching", label: "Coaching" },
    ],
    [],
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Registration failed");
        return;
      }
      router.push("/login?registered=1");
      router.refresh();
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}
      <div>
        <label className="block text-sm font-medium text-slate-700">Your name</label>
        <input
          type="text"
          required
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          className="input-field mt-1"
          placeholder="Admin name"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Email</label>
        <input
          type="email"
          required
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          className="input-field mt-1"
          placeholder="you@example.com"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Password</label>
        <input
          type="password"
          required
          minLength={6}
          value={form.password}
          onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          className="input-field mt-1"
          placeholder="Min 6 characters"
        />
      </div>
      <hr className="border-slate-200" />
      <div>
        <label className="block text-sm font-medium text-slate-700">Institution name</label>
        <input
          type="text"
          required
          value={form.orgName}
          onChange={(e) => setForm((f) => ({ ...f, orgName: e.target.value }))}
          className="input-field mt-1"
          placeholder="School or Coaching name"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Type</label>
        <SearchablePaginatedSelect
          items={orgTypeItems}
          value={form.orgType}
          onChange={(v) => setForm((f) => ({ ...f, orgType: v }))}
          emptyLabel="Institution type"
          required
          className="mt-1"
          aria-label="Institution type"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Phone</label>
        <input
          type="tel"
          value={form.phone}
          onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          className="input-field mt-1"
          placeholder="Contact number"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Address</label>
        <input
          type="text"
          value={form.address}
          onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
          className="input-field mt-1"
          placeholder="Full address"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">City</label>
        <input
          type="text"
          value={form.city}
          onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
          className="input-field mt-1"
          placeholder="City"
        />
      </div>
      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? "Registering..." : "Register"}
      </button>
    </form>
  );
}
