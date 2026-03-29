import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSelectedBranchId, resolveBranchIdForOrganization, requireOrganization } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { requirePermission } from "@/lib/permissions";
import { sendNotificationEmail } from "@/lib/notifications";
import {
  firstZodIssueMessage,
  LIMITS,
  zCuidId,
  zMoney,
  zOptionalStr,
  zPaymentMethodRecord,
  zRecordLineItems,
} from "@/lib/field-validation";

const bodySchema = z
  .object({
    organizationId: zCuidId,
    payerType: z.enum(["student", "staff"]).default("student"),
    studentId: zCuidId.optional(),
    staffId: zCuidId.optional(),
    amount: zMoney.optional(),
    method: zPaymentMethodRecord,
    reference: zOptionalStr(LIMITS.reference),
    feePlanId: z.preprocess((v) => (v === "" ? null : v), z.union([z.null(), zCuidId])).optional(),
    notes: zOptionalStr(LIMITS.notesMax),
    lineItems: zRecordLineItems.optional(),
  })
  .refine((d) => (d.lineItems && d.lineItems.length > 0) || (d.amount != null && d.amount > 0), {
    message: "Enter at least one fee line with amount, or a total amount",
  });

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    requirePermission(session, "fees", "write");
    requireOrganization(session);
    const body = await req.json();
    const rawAmount = body.amount != null && body.amount !== "" ? Number(body.amount) : undefined;
    const data = bodySchema.parse({
      ...body,
      amount: rawAmount,
      lineItems: Array.isArray(body.lineItems) ? body.lineItems : undefined,
    });
    if (data.organizationId !== session.organizationId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const branchId = await resolveBranchIdForOrganization(session.organizationId!, await getSelectedBranchId());

    /** Student/fee rows may have branchId null (legacy); allow current branch OR unassigned in same org. */
    const branchScope = { OR: [{ branchId }, { branchId: null }] };

    let studentForBranch: { id: string; branchId: string | null } | null = null;
    let staffForBranch: { id: string; branchId: string | null } | null = null;
    if (data.payerType === "student") {
      if (!data.studentId) return NextResponse.json({ error: "Student is required" }, { status: 400 });
      studentForBranch = await prisma.student.findFirst({
        where: { id: data.studentId, organizationId: session.organizationId!, ...branchScope },
        select: { id: true, branchId: true },
      });
      if (!studentForBranch) {
        return NextResponse.json(
          { error: "Student not found for this school or branch. Check branch selector and student record." },
          { status: 403 }
        );
      }
    } else {
      if (!data.staffId) return NextResponse.json({ error: "Staff member is required" }, { status: 400 });
      staffForBranch = await prisma.staff.findFirst({
        where: { id: data.staffId, organizationId: session.organizationId!, ...branchScope },
        select: { id: true, branchId: true },
      });
      if (!staffForBranch) {
        return NextResponse.json(
          { error: "Staff not found for this school or branch. Check branch selector." },
          { status: 403 }
        );
      }
    }

    const collectorStaff = session.email
      ? await prisma.staff.findFirst({
          where: { email: session.email, organizationId: session.organizationId!, ...branchScope },
          select: { id: true },
        })
      : null;

    let totalAmount: number;
    let storedLineItems: Array<{ label: string; amount: number; feePlanId: string | null }> | undefined;
    let primaryFeePlanId: string | null = null;

    if (data.lineItems && data.lineItems.length > 0) {
      for (const line of data.lineItems) {
        if (line.feePlanId) {
          const plan = await prisma.feePlan.findFirst({
            where: { id: line.feePlanId, organizationId: session.organizationId!, ...branchScope },
            select: { id: true, payerType: true },
          });
          if (!plan) {
            return NextResponse.json({ error: `Invalid fee plan for line: ${line.label}` }, { status: 400 });
          }
          if ((plan as { payerType?: string }).payerType && (plan as { payerType?: string }).payerType !== data.payerType) {
            return NextResponse.json({ error: "A selected fee plan does not match payer type" }, { status: 400 });
          }
        }
      }
      totalAmount = data.lineItems.reduce((s, l) => s + l.amount, 0);
      storedLineItems = data.lineItems.map((l) => ({
        label: l.label.trim(),
        amount: l.amount,
        feePlanId: l.feePlanId ?? null,
      }));
      const withPlan = data.lineItems.filter((l) => l.feePlanId);
      primaryFeePlanId = withPlan.length === 1 ? (withPlan[0]!.feePlanId ?? null) : null;
    } else {
      let feePlanAmount: number | null = null;
      let planName: string | null = null;
      if (data.feePlanId) {
        const selectedPlan = await prisma.feePlan.findFirst({
          where: { id: data.feePlanId, organizationId: session.organizationId!, ...branchScope },
          select: { id: true, amount: true, payerType: true, name: true },
        });
        if (!selectedPlan) {
          return NextResponse.json({ error: "Invalid fee plan" }, { status: 400 });
        }
        if ((selectedPlan as any).payerType && (selectedPlan as any).payerType !== data.payerType) {
          return NextResponse.json({ error: "Selected plan does not match payer type" }, { status: 400 });
        }
        feePlanAmount = selectedPlan.amount;
        planName = selectedPlan.name ?? null;
      }
      totalAmount = feePlanAmount ?? data.amount!;
      primaryFeePlanId = data.feePlanId ?? null;
      if (data.feePlanId && feePlanAmount != null) {
        storedLineItems = [
          {
            label: planName?.trim() || "Fee",
            amount: feePlanAmount,
            feePlanId: data.feePlanId,
          },
        ];
      } else {
        storedLineItems = [{ label: "Payment", amount: totalAmount, feePlanId: null }];
      }
    }

    const createdPayment = await prisma.payment.create({
      data: {
        organizationId: data.organizationId,
        branchId,
        payerType: data.payerType,
        studentId: studentForBranch?.id ?? null,
        staffId: staffForBranch?.id ?? null,
        collectedByStaffId: collectorStaff?.id ?? null,
        amount: totalAmount,
        method: data.method,
        reference: data.reference ?? null,
        feePlanId: primaryFeePlanId,
        lineItems: storedLineItems ?? undefined,
        notes: data.notes ?? null,
        status: "pending", // receipt downloadable only after admin verifies
      },
      select: { id: true, amount: true, method: true, paidAt: true },
    });

    const [org, student, staff] = await Promise.all([
      prisma.organization.findUnique({
        where: { id: data.organizationId },
        select: { name: true, email: true },
      }),
      data.studentId
        ? prisma.student.findUnique({
            where: { id: data.studentId },
            select: { firstName: true, lastName: true, email: true },
          })
        : Promise.resolve(null),
      data.staffId
        ? prisma.staff.findUnique({
            where: { id: data.staffId },
            select: { firstName: true, lastName: true, email: true },
          })
        : Promise.resolve(null),
    ]);

    const payerName = `${student?.firstName ?? staff?.firstName ?? ""} ${student?.lastName ?? staff?.lastName ?? ""}`.trim();
    const payerEmail = student?.email ?? staff?.email ?? null;

    await sendNotificationEmail({
      to: [org?.email, payerEmail].filter(Boolean) as string[],
      subject: `Fee submitted: ${payerName || "Payer"}`.trim(),
      html: `
        <p>A new fee payment has been submitted.</p>
        <p><strong>Payer Type:</strong> ${data.payerType}</p>
        <p><strong>Payer:</strong> ${payerName || "-"}</p>
        <p><strong>Amount:</strong> INR ${createdPayment.amount}</p>
        <p><strong>Mode:</strong> ${createdPayment.method}</p>
        <p><strong>Date:</strong> ${new Date(createdPayment.paidAt).toLocaleDateString()}</p>
        <p><strong>Status:</strong> Pending verification</p>
      `,
    });
    return NextResponse.json({ ok: true, paymentId: createdPayment.id });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: firstZodIssueMessage(e) }, { status: 400 });
    }
    if (e instanceof Error && e.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    const message = e instanceof Error ? e.message : "Failed";
    console.error("[payments POST]", e);
    return NextResponse.json({ error: "Failed to save payment", detail: message }, { status: 500 });
  }
}
