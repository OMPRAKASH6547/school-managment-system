import type { Prisma } from "@prisma/client";

export type PaymentLineItem = {
  label: string;
  amount: number;
  feePlanId?: string | null;
};

export function parsePaymentLineItems(raw: Prisma.JsonValue | null | undefined): PaymentLineItem[] | null {
  if (raw == null) return null;
  if (!Array.isArray(raw)) return null;
  const out: PaymentLineItem[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    const label = String(o.label ?? "").trim();
    const amount = Number(o.amount);
    if (!label || !Number.isFinite(amount) || amount <= 0) continue;
    const feePlanId = o.feePlanId != null && typeof o.feePlanId === "string" ? o.feePlanId : null;
    out.push({ label, amount, feePlanId });
  }
  return out.length ? out : null;
}
