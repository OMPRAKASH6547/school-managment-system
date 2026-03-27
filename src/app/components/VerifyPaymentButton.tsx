"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function VerifyPaymentButton({ paymentId }: { paymentId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [verifierName, setVerifierName] = useState("");

  async function handleVerify() {
    if (!verifierName.trim()) {
      alert("Enter verifier name");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/school/payments/${paymentId}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verifierName: verifierName.trim() }),
      });
      if (!res.ok) {
        const d = await res.json();
        alert(d.error || "Failed");
        return;
      }
      setOpen(false);
      setVerifierName("");
      router.refresh();
    } catch {
      alert("Failed to verify");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={loading}
        className="ml-2 rounded-lg bg-school-green px-2 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
      >
        {loading ? "..." : "Verify"}
      </button>
      {open ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Verify payment</h3>
            <p className="mt-2 text-sm text-slate-600">Enter verifier name, then continue.</p>
            <div className="mt-4">
              <label className="block text-sm font-medium text-slate-700">Verifier name</label>
              <input
                className="input-field mt-2"
                value={verifierName}
                onChange={(e) => setVerifierName(e.target.value)}
                placeholder="e.g. Admin Name"
              />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => setOpen(false)} disabled={loading}>
                Cancel
              </button>
              <button type="button" className="btn-primary" onClick={handleVerify} disabled={loading}>
                {loading ? "Please wait..." : "Verify"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
