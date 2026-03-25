"use client";

import { useState } from "react";

export function FeeReceiptDownload({ paymentId, isVerified }: { paymentId: string; isVerified: boolean }) {
  const [loading, setLoading] = useState(false);

  async function handleDownload() {
    if (!isVerified) return;
    setLoading(true);
    try {
      const res = await fetch("/api/pdf/fee-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Download failed. Verify the payment first.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const contentDisposition = res.headers.get("content-disposition");
      const match = contentDisposition?.match(/filename="?([^"]+)"?/i);
      a.download = match?.[1] ?? "fee-receipt.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Download failed.");
    } finally {
      setLoading(false);
    }
  }

  if (!isVerified) {
    return (
      <span className="text-xs text-slate-400" title="Verify payment first to download receipt">
        Verify first
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={loading}
      className="text-sm font-medium text-school-green hover:underline disabled:opacity-50"
    >
      {loading ? "..." : "PDF"}
    </button>
  );
}
