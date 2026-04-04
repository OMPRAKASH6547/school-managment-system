import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { payuVerifyResponseHash } from "@/lib/payu";
import { notifyEmailAndWhatsApp } from "@/lib/notifications";
import { getSuperAdminEmails, parseExtraNotifyEmails } from "@/lib/notification-recipients";

function resolveOrigin(req: NextRequest): string {
  const configuredBase = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL;
  if (configuredBase) {
    try {
      return new URL(configuredBase).origin;
    } catch {
      // ignore and fallback
    }
  }
  return req.nextUrl.origin;
}

function redirectToPath(req: NextRequest, path: string) {
  return NextResponse.redirect(new URL(path, resolveOrigin(req)), 302);
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
      return redirectToPath(req, "/payment/payu-status?status=error");
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
      const rows = await prisma.subscriptionInquiry.findMany({
        where: { payuTxnId: txnid },
        take: 1,
        select: { email: true, name: true, schoolName: true, phone: true },
      });
      const row = rows[0];
      const platformEmails = [
        ...new Set([
          ...(await getSuperAdminEmails()),
          ...parseExtraNotifyEmails(process.env.PLATFORM_ALERT_EMAILS),
          ...(row?.email ? [row.email] : []),
        ]),
      ];
      void notifyEmailAndWhatsApp({
        emails: platformEmails,
        phones: row?.phone ? [row.phone] : [],
        subject: `PayU payment success — ${row?.schoolName ?? "Subscription"}`,
        html: `<p>PayU reported a successful payment.</p>
          <p><strong>Txn ID:</strong> ${txnid}</p>
          <p><strong>Amount:</strong> ${amount}</p>
          <p><strong>Product:</strong> ${productinfo}</p>
          <p><strong>Customer:</strong> ${firstname} / ${email}</p>
          <p><strong>School (if any):</strong> ${row?.schoolName ?? "—"}</p>`,
      });
      return redirectToPath(req, `/payment/payu-status?status=success&txnid=${encodeURIComponent(txnid)}`);
    }
    return redirectToPath(req, `/payment/payu-status?status=failed&txnid=${encodeURIComponent(txnid)}`);
  } catch (e) {
    console.error("[payu-callback]", e);
    return redirectToPath(req, "/payment/payu-status?status=error");
  }
}

/**
 * Some gateway/browser flows may hit callback URL with GET.
 * Handle gracefully instead of returning 405.
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const status = (sp.get("status") || "").toLowerCase();
  const txnid = sp.get("txnid") || "";
  if (status === "success" || status === "captured") {
    return redirectToPath(req, `/payment/payu-status?status=success&txnid=${encodeURIComponent(txnid)}`);
  }
  if (status === "failure" || status === "failed") {
    return redirectToPath(req, `/payment/payu-status?status=failed&txnid=${encodeURIComponent(txnid)}`);
  }
  return redirectToPath(req, "/payment/payu-status?status=error");
}
