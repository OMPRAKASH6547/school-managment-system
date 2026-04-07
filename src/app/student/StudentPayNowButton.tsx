"use client";

import { useState } from "react";

export function StudentPayNowButton({ feePlanId, feePeriodMonth }: { feePlanId: string; feePeriodMonth: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function payNow() {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/public/student/payu-initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feePlanId, feePeriodMonth }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to start payment");

      const formEl = document.createElement("form");
      formEl.method = "POST";
      formEl.action = data.action;
      for (const [k, v] of Object.entries(data.fields as Record<string, string>)) {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = k;
        input.value = String(v);
        formEl.appendChild(input);
      }
      document.body.appendChild(formEl);
      formEl.submit();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
      setLoading(false);
    }
  }

  return (
    <div>
      <button type="button" onClick={payNow} disabled={loading} className="btn-primary text-xs">
        {loading ? "Redirecting..." : "Pay now"}
      </button>
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
