"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ApproveRejectForm({ organizationId }: { organizationId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState("");

  async function handleApprove() {
    setLoading("approve");
    setError("");
    try {
      const res = await fetch(`/api/super-admin/organizations/${organizationId}/approve`, { method: "POST" });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || "Failed");
        return;
      }
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  async function handleReject() {
    setLoading("reject");
    setError("");
    try {
      const res = await fetch(`/api/super-admin/organizations/${organizationId}/reject`, { method: "POST" });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || "Failed");
        return;
      }
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  return (
    <div>
      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleApprove}
          disabled={!!loading}
          className="btn-primary"
        >
          {loading === "approve" ? "Approving..." : "Approve"}
        </button>
        <button
          type="button"
          onClick={handleReject}
          disabled={!!loading}
          className="btn-danger"
        >
          {loading === "reject" ? "Rejecting..." : "Reject"}
        </button>
      </div>
    </div>
  );
}
