import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSelectedBranchId, resolveBranchIdForOrganization, requireOrganization } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/permissions";
import { notifyEmailAndWhatsApp } from "@/lib/notifications";
import { getSchoolNotifierEmails, studentFamilyPhones } from "@/lib/notification-recipients";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    requirePermission(session, "fees.verify", "write");
    requireOrganization(session);
    const orgId = session.organizationId!;
    const branchId = await resolveBranchIdForOrganization(orgId, await getSelectedBranchId());
    const { id } = await params;

    const payment = await prisma.payment.findFirst({
      where: { id, organizationId: orgId, branchId },
      select: {
        id: true,
        status: true,
        verifiedAt: true,
        amount: true,
        studentId: true,
        staffId: true,
      },
    });
    if (!payment) return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    if (payment.verifiedAt) {
      return NextResponse.json({ error: "Verified payment cannot be rejected" }, { status: 400 });
    }

    await prisma.payment.update({
      where: { id },
      data: {
        status: "rejected",
        verifiedAt: null,
        verifiedBy: null,
      },
    });

    const [org, student, staff, adminEmails] = await Promise.all([
      prisma.organization.findUnique({
        where: { id: orgId },
        select: { name: true, email: true, phone: true },
      }),
      payment.studentId
        ? prisma.student.findUnique({
            where: { id: payment.studentId },
            select: {
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              motherPhone: true,
              guardianPhone: true,
            },
          })
        : Promise.resolve(null),
      payment.staffId
        ? prisma.staff.findUnique({
            where: { id: payment.staffId },
            select: { firstName: true, lastName: true, email: true, phone: true },
          })
        : Promise.resolve(null),
      getSchoolNotifierEmails(orgId),
    ]);
    const payerName = `${student?.firstName ?? staff?.firstName ?? ""} ${student?.lastName ?? staff?.lastName ?? ""}`.trim();
    const payerEmail = student?.email ?? staff?.email ?? null;
    const phones: string[] = [];
    if (org?.phone) phones.push(org.phone);
    if (student) phones.push(...studentFamilyPhones(student));
    if (staff?.phone) phones.push(staff.phone);
    void notifyEmailAndWhatsApp({
      emails: [...adminEmails, org?.email, payerEmail].filter(Boolean) as string[],
      phones,
      subject: `Payment rejected: ${payerName || "Payer"}`,
      html: `
        <p>A submitted payment was <strong>rejected</strong> during verification.</p>
        <p><strong>Payer:</strong> ${payerName || "-"}</p>
        <p><strong>Amount:</strong> INR ${payment.amount}</p>
        <p>Please contact the school office if you need clarification.</p>
      `,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Error && e.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
