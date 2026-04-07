import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { getLoggedInStudent } from "@/lib/student-auth";
import { prisma } from "@/lib/db";
import { firstZodIssueMessage } from "@/lib/field-validation";
import { payuBaseUrl, payuPaymentHash } from "@/lib/payu";

const bodySchema = z.object({
  feePlanId: z.string().min(1),
  feePeriodMonth: z.string().regex(/^\d{4}-\d{2}$/),
});

function makeTxnId() {
  return `st${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    const student = await getLoggedInStudent(session);
    if (!student) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = bodySchema.parse(await req.json());
    const [org, feePlan] = await Promise.all([
      prisma.organization.findUnique({
        where: { id: student.organizationId },
        select: {
          id: true,
          name: true,
          paymentGatewayEnabled: true,
          paymentGatewayProvider: true,
          payuMerchantKey: true,
          payuMerchantSalt: true,
          payuSuccessUrl: true,
          payuFailureUrl: true,
        },
      }),
      prisma.feePlan.findFirst({
        where: {
          id: body.feePlanId,
          organizationId: student.organizationId,
          payerType: "student",
          isActive: true,
          AND: [
            { OR: [{ branchId: student.branchId }, { branchId: null }] },
            { OR: [{ classId: student.classId }, { classId: null }] },
          ],
        },
        select: { id: true, name: true, amount: true },
      }),
    ]);
    if (!org || !org.paymentGatewayEnabled) {
      return NextResponse.json({ error: "Online payment is not enabled by your school." }, { status: 400 });
    }
    if (!feePlan) return NextResponse.json({ error: "Fee plan not found" }, { status: 404 });
    if (!org.payuMerchantKey || !org.payuMerchantSalt) {
      return NextResponse.json({ error: "Gateway credentials are missing in school settings." }, { status: 400 });
    }

    const txnid = makeTxnId();
    const amount = Number(feePlan.amount).toFixed(2);
    const firstname = `${student.firstName} ${student.lastName}`.trim().slice(0, 60) || "Student";
    const email = `${student.id}@student.local`;
    const productinfo = `${feePlan.name} ${body.feePeriodMonth}`.slice(0, 100);
    const hash = payuPaymentHash({
      key: org.payuMerchantKey,
      txnid,
      amount,
      productinfo,
      firstname,
      email,
      salt: org.payuMerchantSalt,
    });

    const payment = await prisma.payment.create({
      data: {
        organizationId: student.organizationId,
        branchId: student.branchId,
        payerType: "student",
        studentId: student.id,
        amount: feePlan.amount,
        method: "upi",
        status: "pending",
        reference: `payu:${txnid}`,
        feePlanId: feePlan.id,
        feePeriodMonth: body.feePeriodMonth,
        lineItems: [{ label: feePlan.name, amount: feePlan.amount, feePlanId: feePlan.id }],
      },
      select: { id: true },
    });

    const configuredBase = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL;
    let origin = req.nextUrl.origin;
    if (configuredBase) {
      try {
        origin = new URL(configuredBase).origin;
      } catch {
        // ignore
      }
    }
    const surl = org.payuSuccessUrl?.trim() || `${origin}/api/public/student/payu-callback`;
    const furl = org.payuFailureUrl?.trim() || `${origin}/api/public/student/payu-callback`;

    return NextResponse.json({
      ok: true,
      action: payuBaseUrl(),
      fields: {
        key: org.payuMerchantKey,
        txnid,
        amount,
        productinfo,
        firstname,
        email,
        phone: (student.phone ?? "").replace(/\D/g, "").slice(0, 15),
        surl,
        furl,
        hash,
        service_provider: "payu_paisa",
      },
      paymentId: payment.id,
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: firstZodIssueMessage(e) }, { status: 400 });
    }
    console.error("[student/payu-initiate]", e);
    return NextResponse.json({ error: "Failed to start payment" }, { status: 500 });
  }
}
