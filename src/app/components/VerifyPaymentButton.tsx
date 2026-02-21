"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function VerifyPaymentButton({ paymentId }: { paymentId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleVerify() {
    setLoading(true);
    try {
      const res = await fetch(`/api/school/payments/${paymentId}/verify`, { method: "POST" });
      if (!res.ok) {
        const d = await res.json();
        alert(d.error || "Failed");
        return;
      }
      router.refresh();
    } catch {
      alert("Failed to verify");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleVerify}
      disabled={loading}
      className="ml-2 rounded-lg bg-school-green px-2 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
    >
      {loading ? "..." : "Verify"}
    </button>
  );
}
