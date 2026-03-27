import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSelectedBranchId, resolveBranchIdForOrganization, requireOrganization } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { requirePermission } from "@/lib/permissions";
import { sendNotificationEmail } from "@/lib/notifications";

const bodySchema = z.object({
  organizationId: z.string(),
  payerType: z.enum(["student", "staff"]).default("student"),
  studentId: z.string().optional(),
  staffId: z.string().optional(),
  amount: z.number().positive(),
  method: z.string().min(1),
  reference: z.string().nullable().optional(),
  feePlanId: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    requirePermission(session, "fees", "write");
    requireOrganization(session);
    const body = await req.json();
    const data = bodySchema.parse({
      ...body,
      amount: Number(body.amount),
    });
    if (data.organizationId !== session.organizationId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const branchId = await resolveBranchIdForOrganization(session.organizationId!, await getSelectedBranchId());

    let studentForBranch: { id: string; branchId: string | null } | null = null;
    let staffForBranch: { id: string; branchId: string | null } | null = null;
    if (data.payerType === "student") {
      if (!data.studentId) return NextResponse.json({ error: "Student is required" }, { status: 400 });
      studentForBranch = await prisma.student.findFirst({
        where: { id: data.studentId, organizationId: session.organizationId!, branchId },
        select: { id: true, branchId: true },
      });
      if (!studentForBranch) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    } else {
      if (!data.staffId) return NextResponse.json({ error: "Staff member is required" }, { status: 400 });
      staffForBranch = await prisma.staff.findFirst({
        where: { id: data.staffId, organizationId: session.organizationId!, branchId },
        select: { id: true, branchId: true },
      });
      if (!staffForBranch) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const collectorStaff = session.email
      ? await prisma.staff.findFirst({
          where: { email: session.email, organizationId: session.organizationId!, branchId },
          select: { id: true },
        })
      : null;

    let feePlanAmount: number | null = null;
    if (data.feePlanId) {
      const selectedPlan = await prisma.feePlan.findFirst({
        where: { id: data.feePlanId, organizationId: session.organizationId!, branchId },
        select: { id: true, amount: true, payerType: true },
      });
      if (!selectedPlan) {
        return NextResponse.json({ error: "Invalid fee plan" }, { status: 400 });
      }
      if ((selectedPlan as any).payerType && (selectedPlan as any).payerType !== data.payerType) {
        return NextResponse.json({ error: "Selected plan does not match payer type" }, { status: 400 });
      }
      feePlanAmount = selectedPlan.amount;
    }

    const createdPayment = await prisma.payment.create({
      data: {
        organizationId: data.organizationId,
        branchId,
        payerType: data.payerType,
        studentId: studentForBranch?.id ?? null,
        staffId: staffForBranch?.id ?? null,
        collectedByStaffId: collectorStaff?.id ?? null,
        amount: feePlanAmount ?? data.amount,
        method: data.method,
        reference: data.reference ?? null,
        feePlanId: data.feePlanId ?? null,
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
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.errors[0]?.message }, { status: 400 });
    }
    if (e instanceof Error && e.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
