"use client";

import { useState } from "react";

export type PublicPlan = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  maxStudents: number;
  maxStaff: number;
};

export function PricingPlansSection({ plans }: { plans: PublicPlan[] }) {
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [forms, setForms] = useState<Record<string, { email: string; name: string; phone: string; schoolName: string }>>({});

  function field(planId: string, key: keyof (typeof forms)[string], value: string) {
    setForms((prev) => ({
      ...prev,
      [planId]: {
        ...(prev[planId] ?? { email: "", name: "", phone: "", schoolName: "" }),
        [key]: value,
      },
    }));
  }

  async function requestDemo(planId: string) {
    const f = forms[planId] ?? { email: "", name: "", phone: "", schoolName: "" };
    setLoadingId(`demo-${planId}`);
    setMsg(null);
    try {
      const res = await fetch("/api/public/subscription-demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId,
          email: f.email,
          name: f.name || undefined,
          phone: f.phone || undefined,
          schoolName: f.schoolName || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setMsg({ type: "ok", text: data.message ?? "Request sent." });
    } catch (e) {
      setMsg({ type: "err", text: e instanceof Error ? e.message : "Failed" });
    } finally {
      setLoadingId(null);
    }
  }

  async function payWithPayU(planId: string) {
    const f = forms[planId] ?? { email: "", name: "", phone: "", schoolName: "" };
    if (!f.email.trim() || !f.name.trim()) {
      setMsg({ type: "err", text: "Email and name are required for payment." });
      return;
    }
    setLoadingId(`pay-${planId}`);
    setMsg(null);
    try {
      const res = await fetch("/api/public/payu-initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId,
          email: f.email,
          name: f.name,
          phone: f.phone || undefined,
          schoolName: f.schoolName || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      const formEl = document.createElement("form");
      formEl.method = "POST";
      formEl.action = data.action;
      for (const [k, v] of Object.entries(data.fields as Record<string, string>)) {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = k;
        input.value = v;
        formEl.appendChild(input);
      }
      document.body.appendChild(formEl);
      formEl.submit();
    } catch (e) {
      setMsg({ type: "err", text: e instanceof Error ? e.message : "Failed" });
    } finally {
      setLoadingId(null);
    }
  }

  if (plans.length === 0) {
    return (
      <p className="mt-8 text-center text-slate-400">
        Subscription plans will appear here once the super admin creates them.
      </p>
    );
  }

  return (
    <div className="mt-16">
      <h2 className="text-center text-2xl font-bold text-white">Subscription plans</h2>
      <p className="mx-auto mt-2 max-w-2xl text-center text-slate-300">
        Request a free demo (no payment) or pay online with PayU when configured.
      </p>
      {msg && (
        <p
          className={`mx-auto mt-4 max-w-lg rounded-lg px-4 py-2 text-center text-sm ${
            msg.type === "ok" ? "bg-emerald-500/20 text-emerald-100" : "bg-red-500/20 text-red-100"
          }`}
        >
          {msg.text}
        </p>
      )}
      <div className="mt-10 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => {
          const f = forms[plan.id] ?? { email: "", name: "", phone: "", schoolName: "" };
          return (
            <div key={plan.id} className="card flex flex-col border-white/10 bg-white/5 backdrop-blur">
              <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
              <p className="mt-1 text-3xl font-bold text-primary-300">₹{plan.price}<span className="text-base font-normal text-slate-400">/mo</span></p>
              <p className="mt-2 flex-1 text-sm text-slate-300">{plan.description || "Includes core school management features."}</p>
              <p className="mt-2 text-xs text-slate-400">
                Up to {plan.maxStudents} students · {plan.maxStaff} staff
              </p>
              <div className="mt-4 space-y-2">
                <input
                  type="email"
                  required
                  placeholder="Email *"
                  className="input-field w-full text-slate-900"
                  value={f.email}
                  onChange={(e) => field(plan.id, "email", e.target.value)}
                />
                <input
                  type="text"
                  placeholder="Your name * (for payment)"
                  className="input-field w-full text-slate-900"
                  value={f.name}
                  onChange={(e) => field(plan.id, "name", e.target.value)}
                />
                <input
                  type="tel"
                  placeholder="Phone"
                  className="input-field w-full text-slate-900"
                  value={f.phone}
                  onChange={(e) => field(plan.id, "phone", e.target.value)}
                />
                <input
                  type="text"
                  placeholder="School / institute name"
                  className="input-field w-full text-slate-900"
                  value={f.schoolName}
                  onChange={(e) => field(plan.id, "schoolName", e.target.value)}
                />
              </div>
              <div className="mt-4 flex flex-col gap-2">
                <button
                  type="button"
                  disabled={loadingId !== null}
                  onClick={() => requestDemo(plan.id)}
                  className="rounded-lg border border-white/30 bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20"
                >
                  {loadingId === `demo-${plan.id}` ? "Sending…" : "Request demo (free)"}
                </button>
                <button
                  type="button"
                  disabled={loadingId !== null}
                  onClick={() => payWithPayU(plan.id)}
                  className="btn-primary rounded-lg bg-primary-500 py-2 text-sm"
                >
                  {loadingId === `pay-${plan.id}` ? "Redirecting…" : "Pay with PayU"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
