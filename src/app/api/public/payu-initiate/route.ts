import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { firstZodIssueMessage } from "@/lib/field-validation";
import { payuBaseUrl, payuPaymentHash } from "@/lib/payu";

function makePayuTxnId() {
  // Keep it short and URL/form safe for gateway constraints.
  return `txn${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

function safeFirstName(name: string) {
  const cleaned = name.replace(/[^a-zA-Z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
  return (cleaned || "Customer").slice(0, 60);
}

function safeProductInfo(planName: string, planSlug: string) {
  const raw = `${planName} ${planSlug}`.replace(/[^a-zA-Z0-9 _-]/g, " ").replace(/\s+/g, " ").trim();
  return (raw || "Subscription").slice(0, 100);
}

const bodySchema = z.object({
  planId: z.string().min(1),
  email: z.string().email(),
  name: z.string().min(1).max(120),
  phone: z.string().max(24).optional(),
  schoolName: z.string().max(120).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const key = process.env.PAYU_MERCHANT_KEY;
    const salt = process.env.PAYU_MERCHANT_SALT;
    if (!key || !salt) {
      return NextResponse.json(
        { error: "PayU is not configured. Set PAYU_MERCHANT_KEY and PAYU_MERCHANT_SALT on the server." },
        { status: 503 }
      );
    }

    const body = bodySchema.parse(await req.json());
    const plan = await prisma.subscriptionPlan.findFirst({
      where: { id: body.planId, isActive: true },
      select: { id: true, name: true, price: true, slug: true },
    });
    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    const txnid = makePayuTxnId();
    await prisma.subscriptionInquiry.create({
      data: {
        planId: plan.id,
        email: body.email.trim().toLowerCase(),
        name: body.name.trim(),
        phone: body.phone?.trim() || null,
        schoolName: body.schoolName?.trim() || null,
        source: "payu",
        amountSnapshot: plan.price,
        payuTxnId: txnid,
        payuStatus: "pending",
      },
    });

    const amount = plan.price.toFixed(2);
    const productinfo = safeProductInfo(plan.name, plan.slug);
    const firstname = safeFirstName(body.name.trim());
    const email = body.email.trim().toLowerCase();
    const phone = (body.phone ?? "").replace(/\D/g, "").slice(0, 15);
    const hash = payuPaymentHash({ key, txnid, amount, productinfo, firstname, email, salt });

    const base = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const surl = `${base.replace(/\/$/, "")}/api/public/payu-callback`;
    const furl = surl;

    if (process.env.PAYU_DEBUG === "1") {
      console.log("[payu-initiate] payload", {
        action: payuBaseUrl(),
        key,
        txnid,
        amount,
        productinfo,
        firstname,
        email,
        phone,
        surl,
        furl,
      });
    }

    return NextResponse.json({
      ok: true,
      action: payuBaseUrl(),
      fields: {
        key,
        txnid,
        amount,
        productinfo,
        firstname,
        email,
        phone,
        surl,
        furl,
        hash,
        service_provider: "payu_paisa",
      },
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: firstZodIssueMessage(e) }, { status: 400 });
    }
    console.error("[payu-initiate]", e);
    return NextResponse.json({ error: "Failed to start payment" }, { status: 500 });
  }
}
