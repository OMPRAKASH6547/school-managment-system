import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSelectedBranchId, resolveBranchIdForOrganization, requireOrganization } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/permissions";
import { sendNotificationEmail } from "@/lib/notifications";
import { z } from "zod";

const bodySchema = z.object({
  verifierName: z.string().min(2),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    requirePermission(session, "fees.verify", "write");
    requireOrganization(session);
    const orgId = session.organizationId!;
    const branchId = await resolveBranchIdForOrganization(orgId, await getSelectedBranchId());
    const body = bodySchema.parse(await req.json());
    const { id } = await params;
    const payment = await prisma.payment.findFirst({
      where: { id, organizationId: orgId, branchId },
    });
    if (!payment) return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    if (payment.verifiedAt) {
      return NextResponse.json({ error: "Already verified" }, { status: 400 });
    }
    await prisma.payment.update({
      where: { id },
      data: {
        status: "verified",
        verifiedAt: new Date(),
        verifiedBy: session.id,
        verifiedByName: body.verifierName.trim(),
      },
    });

    const [org, student, staff, verifier] = await Promise.all([
      prisma.organization.findUnique({
        where: { id: orgId },
        select: { name: true, email: true },
      }),
      payment.studentId
        ? prisma.student.findUnique({
            where: { id: payment.studentId },
            select: { firstName: true, lastName: true, email: true },
          })
        : Promise.resolve(null),
      payment.staffId
        ? prisma.staff.findUnique({
            where: { id: payment.staffId },
            select: { firstName: true, lastName: true, email: true },
          })
        : Promise.resolve(null),
      Promise.resolve({ name: body.verifierName.trim() }),
    ]);
    const payerName = `${student?.firstName ?? staff?.firstName ?? ""} ${student?.lastName ?? staff?.lastName ?? ""}`.trim();
    const payerEmail = student?.email ?? staff?.email ?? null;

    await sendNotificationEmail({
      to: [org?.email, payerEmail].filter(Boolean) as string[],
      subject: `Payment verified: ${payerName || "Payer"}`.trim(),
      html: `
        <p>A payment has been verified.</p>
        <p><strong>Payer:</strong> ${payerName || "-"}</p>
        <p><strong>Amount:</strong> INR ${payment.amount}</p>
        <p><strong>Verified By:</strong> ${verifier?.name ?? "-"}</p>
      `,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.errors[0]?.message ?? "Invalid verifier name" }, { status: 400 });
    }
    if (e instanceof Error && e.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
