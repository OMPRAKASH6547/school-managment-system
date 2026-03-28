"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { SearchablePaginatedSelect } from "@/app/components/SearchablePaginatedSelect";

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
  const planItems = useMemo(
    () => plans.map((p) => ({ value: p.id, label: `${p.name} — ₹${p.price}/mo` })),
    [plans],
  );

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
      <SearchablePaginatedSelect
        items={planItems}
        value={planId}
        onChange={setPlanId}
        emptyLabel="Select plan"
        required
        aria-label="Subscription plan"
      />
      <button type="submit" disabled={loading || !planId} className="btn-primary mt-3">
        {loading ? "Saving..." : "Assign plan"}
      </button>
    </form>
  );
}
