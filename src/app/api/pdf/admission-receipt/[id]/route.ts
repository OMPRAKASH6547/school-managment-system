import { NextRequest, NextResponse } from "next/server";
import { pdf } from "@react-pdf/renderer";
import QRCode from "qrcode";
import { prisma } from "@/lib/db";
import { getSession, getSelectedBranchId, resolveBranchIdForOrganization, requireOrganization } from "@/lib/auth";
import { createAdmissionReceiptDocument } from "@/lib/pdf/AdmissionReceipt";
import { requirePermission } from "@/lib/permissions";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    requirePermission(session, "students", "read");
    requireOrganization(session);

    const orgId = session.organizationId!;
    const branchId = await resolveBranchIdForOrganization(orgId, await getSelectedBranchId());
    const { id } = await params;

    const payment = await prisma.payment.findFirst({
      where: { id, organizationId: orgId, branchId },
      select: {
        id: true,
        amount: true,
        paidAt: true,
        method: true,
        reference: true,
        student: {
          select: {
            firstName: true,
            lastName: true,
            rollNo: true,
            aadhaarNo: true,
            bloodGroup: true,
            dateOfBirth: true,
          },
        },
        organization: { select: { name: true, logo: true, address: true, phone: true, email: true } },
        verifiedBy: true,
      },
    });

    if (!payment) return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
    if (!payment.student || !payment.organization) {
      return NextResponse.json({ error: "Missing receipt relations" }, { status: 500 });
    }

    let createdByName: string | null = null;
    if (payment.verifiedBy) {
      const u = await prisma.user.findFirst({
        where: { id: payment.verifiedBy },
        select: { name: true },
      });
      createdByName = u?.name ?? null;
    }

    const baseUrl = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
    const verifyUrl = `${baseUrl.replace(/\/$/, "")}/payment/verify?paymentId=${encodeURIComponent(payment.id)}`;
    const qrDataUrl = await QRCode.toDataURL(verifyUrl);

    const doc = createAdmissionReceiptDocument({
      org: payment.organization,
      student: payment.student,
      payment: {
        id: payment.id,
        amount: payment.amount,
        paidAt: payment.paidAt,
        method: payment.method,
        reference: payment.reference ?? null,
      },
      qrDataUrl,
      createdByName,
    });

    const pdfBuffer = await pdf(doc).toBuffer();
    const studentNameSafe = `${payment.student.firstName}-${payment.student.lastName}`.replace(/\s+/g, "-");
    const filename = `${studentNameSafe}_admission_receipt.pdf`;

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e) {
    if (e instanceof Error && e.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed to generate receipt" }, { status: 500 });
  }
}

