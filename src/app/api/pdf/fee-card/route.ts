import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import QRCode from "qrcode";
import { pdf } from "@react-pdf/renderer";
import { Readable } from "node:stream";
import { prisma } from "@/lib/db";
import { getSession, getSelectedBranchId, resolveBranchIdForOrganization, requireOrganization } from "@/lib/auth";
import { createFeeCardDocument } from "@/lib/pdf/FeeCard";
import { loadImageDataUriForPdf } from "@/lib/pdf/loadImageForPdf";
import { pdfThemeFromAccent } from "@/lib/pdf/pdfTheme";
import { requirePermission } from "@/lib/permissions";
import { parsePaymentLineItems } from "@/lib/payment-line-items";

async function nodeStreamToUint8Array(stream: Readable): Promise<Uint8Array> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return new Uint8Array(Buffer.concat(chunks));
}

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
    const branchId = await resolveBranchIdForOrganization(orgId, await getSelectedBranchId());
    const branchScope = { OR: [{ branchId }, { branchId: null }] as const };

    const payment = await prisma.payment.findFirst({
      where: { id: body.paymentId, organizationId: orgId, ...branchScope },
      select: {
        id: true,
        payerType: true,
        amount: true,
        paidAt: true,
        method: true,
        reference: true,
        status: true,
        verifiedAt: true,
        verifiedBy: true,
        verifiedByName: true,
        lineItems: true,
        student: { select: { id: true, firstName: true, lastName: true, rollNo: true } },
        staff: { select: { id: true, firstName: true, lastName: true, employeeId: true } },
        collectedBy: { select: { id: true, firstName: true, lastName: true } },
        organization: {
          select: { id: true, name: true, logo: true, address: true, phone: true, email: true, pdfAccentColor: true },
        },
      },
    });

    if (!payment) return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    if (!payment.organization || (!payment.student && !payment.staff)) {
      return NextResponse.json({ error: "Missing payment relations" }, { status: 500 });
    }
    if (payment.status !== "verified" || !payment.verifiedAt) {
      return NextResponse.json({ error: "Payment not verified yet" }, { status: 403 });
    }

    let verifiedByName: string | null = payment.verifiedByName?.trim() || null;
    if (!verifiedByName && payment.verifiedBy) {
      const user = await prisma.user.findFirst({
        where: { id: payment.verifiedBy },
        select: { name: true },
      });
      verifiedByName = user?.name?.trim() || null;
    }
    if (!verifiedByName && payment.collectedBy) {
      verifiedByName = `${payment.collectedBy.firstName} ${payment.collectedBy.lastName}`.trim() || null;
    }

    const issuedByName = session.name?.trim() || session.email || null;

    const baseUrl =
      process.env.NEXTAUTH_URL ??
      process.env.NEXT_PUBLIC_BASE_URL ??
      "http://localhost:3000";

    const verificationUrl = `${baseUrl.replace(/\/$/, "")}/payment/verify?paymentId=${encodeURIComponent(
      payment.id
    )}`;

    const qrDataUrl = await QRCode.toDataURL(verificationUrl);

    const payerNameSafe = `${payment.student?.firstName ?? payment.staff?.firstName ?? ""} ${payment.student?.lastName ?? payment.staff?.lastName ?? ""}`
      .trim()
      .replace(/\s+/g, "-");
    const receiptDate = payment.verifiedAt.toISOString().slice(0, 10);
    const filename = `${payerNameSafe || "payment"}_receipt_${receiptDate}.pdf`;

    const logoDataUri = await loadImageDataUriForPdf(payment.organization.logo);
    const pdfTheme = pdfThemeFromAccent(payment.organization.pdfAccentColor);

    const breakdown =
      parsePaymentLineItems(payment.lineItems) ?? [{ label: "Payment", amount: payment.amount }];

    const doc = createFeeCardDocument({
      org: payment.organization,
      logoDataUri,
      pdfTheme,
      payer: payment.student
        ? { type: "student", firstName: payment.student.firstName, lastName: payment.student.lastName, code: payment.student.rollNo }
        : { type: "staff", firstName: payment.staff?.firstName ?? "", lastName: payment.staff?.lastName ?? "", code: payment.staff?.employeeId ?? null },
      payment: {
        id: payment.id,
        payerType: payment.payerType,
        amount: payment.amount,
        paidAt: payment.paidAt,
        method: payment.method,
        reference: payment.reference ?? null,
        status: payment.status,
        verifiedAt: payment.verifiedAt,
        lineItems: breakdown,
      },
      qrDataUrl,
      verifiedByName,
      issuedByName,
    });

    const pdfOutput = await pdf(doc).toBuffer();
    const pdfBytes =
      pdfOutput instanceof Uint8Array
        ? pdfOutput
        : pdfOutput instanceof ArrayBuffer
        ? new Uint8Array(pdfOutput)
        : pdfOutput instanceof Readable
        ? await nodeStreamToUint8Array(pdfOutput)
        : new Uint8Array(Buffer.from(pdfOutput as unknown as ArrayBuffer));

    return new NextResponse(pdfBytes, {
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