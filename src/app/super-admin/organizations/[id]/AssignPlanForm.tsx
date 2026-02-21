"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Plan = { id: string; name: string; slug: string; price: number };

export function AssignPlanForm({
  organizationId,
  plans,
  currentPlanId,
}: {
  organizationId: string;
  plans: Plan[];
  currentPlanId?: string;
}) {
  const router = useRouter();
  const [planId, setPlanId] = useState(currentPlanId ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!planId) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/super-admin/organizations/${organizationId}/assign-plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || "Failed");
        return;
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
      <select
        value={planId}
        onChange={(e) => setPlanId(e.target.value)}
        className="input-field"
        required
      >
        <option value="">Select plan</option>
        {plans.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name} — ₹{p.price}/mo
          </option>
        ))}
      </select>
      <button type="submit" disabled={loading || !planId} className="btn-primary mt-3">
        {loading ? "Saving..." : "Assign plan"}
      </button>
    </form>
  );
}
