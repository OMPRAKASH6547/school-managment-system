"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function BranchCreateForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [branchCode, setBranchCode] = useState("");
  const [address, setAddress] = useState("");
  const [contact, setContact] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/school/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          branchCode: branchCode.trim() ? branchCode.trim() : null,
          address: address.trim() ? address.trim() : null,
          contact: contact.trim() ? contact.trim() : null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Failed to create branch");
        return;
      }
      setName("");
      setBranchCode("");
      setAddress("");
      setContact("");
      router.refresh();
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-slate-700">Branch name</label>
          <input
            className="input-field mt-1 w-full"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="e.g. Main Branch"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">Branch code (optional)</label>
          <input
            className="input-field mt-1 w-full"
            value={branchCode}
            onChange={(e) => setBranchCode(e.target.value)}
            placeholder="e.g. BR-ABCDE"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">Address (optional)</label>
          <input
            className="input-field mt-1 w-full"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Branch address"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">Contact (optional)</label>
          <input
            className="input-field mt-1 w-full"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="Phone/email"
          />
        </div>
      </div>

      <button type="submit" disabled={loading} className="btn-primary mt-6">
        {loading ? "Creating..." : "Create branch"}
      </button>
    </form>
  );
}

