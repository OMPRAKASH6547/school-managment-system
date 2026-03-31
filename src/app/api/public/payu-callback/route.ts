import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { payuVerifyResponseHash } from "@/lib/payu";

function redirectToHome(path: string) {
  const base = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  return NextResponse.redirect(new URL(path, base), 302);
}

/**
 * PayU posts form fields (application/x-www-form-urlencoded) to surl/furl.
 */
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

    const salt = process.env.PAYU_MERCHANT_SALT;
    if (!salt || !txnid) {
      return redirectToHome("/?payu=error");
    }

    const expected = payuVerifyResponseHash({
      salt,
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

    await prisma.subscriptionInquiry.updateMany({
      where: { payuTxnId: txnid },
      data: {
        payuStatus: ok ? "success" : status === "failure" ? "failure" : "pending",
        payuMihpayId: mihpayid || null,
      },
    });

    if (ok) {
      return redirectToHome("/?payu=success");
    }
    return redirectToHome("/?payu=failed");
  } catch (e) {
    console.error("[payu-callback]", e);
    return redirectToHome("/?payu=error");
  }
}

/**
 * Some gateway/browser flows may hit callback URL with GET.
 * Handle gracefully instead of returning 405.
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const status = (sp.get("status") || "").toLowerCase();
  if (status === "success" || status === "captured") {
    return redirectToHome("/?payu=success");
  }
  if (status === "failure" || status === "failed") {
    return redirectToHome("/?payu=failed");
  }
  return redirectToHome("/?payu=error");
}
