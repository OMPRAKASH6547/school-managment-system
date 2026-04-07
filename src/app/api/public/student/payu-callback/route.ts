import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { payuVerifyResponseHash } from "@/lib/payu";

function resolveOrigin(req: NextRequest): string {
  const configuredBase = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL;
  if (configuredBase) {
    try {
      return new URL(configuredBase).origin;
    } catch {
      // ignore
    }
  }
  return req.nextUrl.origin;
}

function redirectTo(req: NextRequest, status: "success" | "failed" | "error", txnid = "") {
  const path = `/student/payment-status?status=${status}${txnid ? `&txnid=${encodeURIComponent(txnid)}` : ""}`;
  return NextResponse.redirect(new URL(path, resolveOrigin(req)), 302);
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const status = String(form.get("status") ?? "");
    const txnid = String(form.get("txnid") ?? "");
    const amount = String(form.get("amount") ?? "");
    const productinfo = String(form.get("productinfo") ?? "");
    const firstname = String(form.get("firstname") ?? "");
    const email = String(form.get("email") ?? "");
    const key = String(form.get("key") ?? "");
    const hashFromPayu = String(form.get("hash") ?? "");
    const mihpayid = String(form.get("mihpayid") ?? "");
    const udf1 = String(form.get("udf1") ?? "");
    const udf2 = String(form.get("udf2") ?? "");
    const udf3 = String(form.get("udf3") ?? "");
    const udf4 = String(form.get("udf4") ?? "");
    const udf5 = String(form.get("udf5") ?? "");

    if (!txnid) return redirectTo(req, "error");

    const payment = await prisma.payment.findFirst({
      where: { reference: `payu:${txnid}` },
      select: {
        id: true,
        organizationId: true,
        amount: true,
        method: true,
        feePlanId: true,
        studentId: true,
      },
    });
    if (!payment) return redirectTo(req, "failed", txnid);

    const org = await prisma.organization.findUnique({
      where: { id: payment.organizationId },
      select: { payuMerchantSalt: true },
    });
    if (!org?.payuMerchantSalt) return redirectTo(req, "error", txnid);

    const expected = payuVerifyResponseHash({
      salt: org.payuMerchantSalt,
      status,
      udf5,
      udf4,
      udf3,
      udf2,
      udf1,
      email,
      firstname,
      productinfo,
      amount,
      txnid,
      key,
    });
    const ok = expected === hashFromPayu && (status === "success" || status === "captured");

    await prisma.payment.update({
      where: { id: payment.id },
      data: ok
        ? {
            status: "verified",
            verifiedAt: new Date(),
            verifiedByName: "PayU Auto",
            reference: `payu:${txnid}:${mihpayid || "ok"}`,
          }
        : {
            status: "pending",
            reference: `payu:${txnid}:failed`,
          },
    });

    return redirectTo(req, ok ? "success" : "failed", txnid);
  } catch (e) {
    console.error("[student/payu-callback]", e);
    return redirectTo(req, "error");
  }
}

export async function GET(req: NextRequest) {
  const status = (req.nextUrl.searchParams.get("status") || "").toLowerCase();
  const txnid = req.nextUrl.searchParams.get("txnid") || "";
  if (status === "success" || status === "captured") return redirectTo(req, "success", txnid);
  if (status === "failed" || status === "failure") return redirectTo(req, "failed", txnid);
  return redirectTo(req, "error", txnid);
}
