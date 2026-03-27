"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/app/components/ConfirmDialog";

export function RejectPaymentButton({ paymentId }: { paymentId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function handleRejectConfirmed() {
    setLoading(true);
    try {
      const res = await fetch(`/api/school/payments/${paymentId}/reject`, { method: "POST" });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        alert(d.error || "Failed");
        return;
      }
      router.refresh();
    } catch {
      alert("Failed to reject");
    } finally {
      setLoading(false);
      setConfirmOpen(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        disabled={loading}
        className={`ml-2 rounded-lg bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50 ${
          loading ? "btn-loading" : ""
        }`}
      >
        {loading ? "..." : "Reject"}
      </button>
      <ConfirmDialog
        open={confirmOpen}
        title="Reject payment?"
        message="This will mark the payment as rejected."
        confirmText="Reject"
        danger
        loading={loading}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleRejectConfirmed}
      />
    </>
  );
}
