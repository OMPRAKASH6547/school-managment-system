import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import QRCode from "qrcode";
import { pdf } from "@react-pdf/renderer";
import { prisma } from "@/lib/db";
import { getSession, getSelectedBranchId, requireBranchAccess, requireOrganization } from "@/lib/auth";
import { createFeeCardDocument } from "@/lib/pdf/FeeCard";
import { requirePermission } from "@/lib/permissions";

const bodySchema = z.object({
  paymentId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = bodySchema.parse(await req.json());

    const session = await getSession();
    requirePermission(session, "fees", "read");
    requireOrganization(session);

    const orgId = session.organizationId!;
    const branchId = await requireBranchAccess(orgId, await getSelectedBranchId());

    const payment = await prisma.payment.findFirst({
      where: { id: body.paymentId, organizationId: orgId, branchId },
      select: {
        id: true,
        amount: true,
        paidAt: true,
        method: true,
        reference: true,
        status: true,
        verifiedAt: true,
        verifiedBy: true,
        student: { select: { id: true, firstName: true, lastName: true, rollNo: true } },
        organization: { select: { id: true, name: true, logo: true, address: true, phone: true, email: true } },
      },
    });

    if (!payment) return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    if (!payment.student || !payment.organization) {
      return NextResponse.json({ error: "Missing payment relations" }, { status: 500 });
    }
    if (payment.status !== "verified" || !payment.verifiedAt) {
      return NextResponse.json({ error: "Payment not verified yet" }, { status: 403 });
    }

    let acceptedByName: string | null = null;
    if (payment.verifiedBy) {
      const user = await prisma.user.findFirst({
        where: { id: payment.verifiedBy },
        select: { name: true },
      });
      acceptedByName = user?.name ?? null;
    }

    const baseUrl =
      process.env.NEXTAUTH_URL ??
      process.env.NEXT_PUBLIC_BASE_URL ??
      "http://localhost:3000";

    const verificationUrl = `${baseUrl.replace(/\/$/, "")}/payment/verify?paymentId=${encodeURIComponent(
      payment.id
    )}`;

    const qrDataUrl = await QRCode.toDataURL(verificationUrl);

    const studentNameSafe = `${payment.student.firstName} ${payment.student.lastName}`
      .trim()
      .replace(/\s+/g, "-");
    const receiptDate = payment.verifiedAt.toISOString().slice(0, 10);
    const filename = `${studentNameSafe}_receipt_${receiptDate}.pdf`;

    const doc = createFeeCardDocument({
      org: payment.organization,
      student: payment.student,
      payment: {
        id: payment.id,
        amount: payment.amount,
        paidAt: payment.paidAt,
        method: payment.method,
        reference: payment.reference ?? null,
        status: payment.status,
        verifiedAt: payment.verifiedAt,
      },
      qrDataUrl,
      acceptedByName,
    });

    const pdfBuffer = await pdf(doc).toBuffer();

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.errors[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    if (e instanceof Error && e.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed to generate receipt" }, { status: 500 });
  }
}