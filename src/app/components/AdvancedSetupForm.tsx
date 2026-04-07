"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  paymentGatewayEnabled: boolean;
  paymentGatewayProvider: string | null;
  payuMerchantKey: string | null;
  payuMerchantSalt: string | null;
  payuSuccessUrl: string | null;
  payuFailureUrl: string | null;
};

export function AdvancedSetupForm(props: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    paymentGatewayEnabled: !!props.paymentGatewayEnabled,
    paymentGatewayProvider: props.paymentGatewayProvider ?? "payu",
    payuMerchantKey: props.payuMerchantKey ?? "",
    payuMerchantSalt: props.payuMerchantSalt ?? "",
    payuSuccessUrl: props.payuSuccessUrl ?? "",
    payuFailureUrl: props.payuFailureUrl ?? "",
  });

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    setLoading(true);
    try {
      const res = await fetch("/api/school/advanced-setup", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(data.error ?? "Failed to save.");
        return;
      }
      setMessage("Advanced setup saved.");
      router.refresh();
    } catch {
      setMessage("Failed to save.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={onSave}>
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
        <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            checked={form.paymentGatewayEnabled}
            onChange={(e) => setForm((f) => ({ ...f, paymentGatewayEnabled: e.target.checked }))}
          />
          Enable online payment gateway
        </label>
        <p className="mt-1 text-xs text-slate-500">
          When enabled, students will see online fee payment options in their dashboard.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">Gateway provider</label>
        <select
          className="input-field mt-1"
          value={form.paymentGatewayProvider}
          onChange={(e) => setForm((f) => ({ ...f, paymentGatewayProvider: e.target.value }))}
        >
          <option value="payu">PayU Money</option>
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-slate-700">Merchant Key</label>
          <input
            className="input-field mt-1"
            value={form.payuMerchantKey}
            onChange={(e) => setForm((f) => ({ ...f, payuMerchantKey: e.target.value }))}
            placeholder="Enter PayU Merchant Key"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Merchant Salt</label>
          <input
            className="input-field mt-1"
            value={form.payuMerchantSalt}
            onChange={(e) => setForm((f) => ({ ...f, payuMerchantSalt: e.target.value }))}
            placeholder="Enter PayU Merchant Salt"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-slate-700">Success URL</label>
          <input
            type="url"
            className="input-field mt-1"
            value={form.payuSuccessUrl}
            onChange={(e) => setForm((f) => ({ ...f, payuSuccessUrl: e.target.value }))}
            placeholder="https://yourdomain.com/api/public/student/payu-callback"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Failure URL</label>
          <input
            type="url"
            className="input-field mt-1"
            value={form.payuFailureUrl}
            onChange={(e) => setForm((f) => ({ ...f, payuFailureUrl: e.target.value }))}
            placeholder="https://yourdomain.com/student/payment-status?status=failed"
          />
        </div>
      </div>

      <button type="submit" className="btn-primary" disabled={loading}>
        {loading ? "Saving..." : "Save advanced setup"}
      </button>
      {message ? <p className="text-sm text-slate-600">{message}</p> : null}
    </form>
  );
}
