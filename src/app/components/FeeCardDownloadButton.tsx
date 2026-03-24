"use client";
import React from "react";

interface FeeCardDownloadButtonProps {
  paymentId: string;
  children?: React.ReactNode;
}

export function FeeCardDownloadButton({ paymentId, children }: FeeCardDownloadButtonProps) {
  const handleDownload = async () => {
    const res = await fetch("/api/pdf/fee-card", {
      method: "POST",
      body: JSON.stringify({ paymentId }),
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) {
      alert("Failed to download PDF");
      return;
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "fee-receipt.pdf";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  return (
    <button type="button" onClick={handleDownload} className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700">
      {children || "Download Fee Card"}
    </button>
  );
}
