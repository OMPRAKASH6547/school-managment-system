import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import QRCode from "qrcode";
import { pdf } from "@react-pdf/renderer";
import { Readable } from "node:stream";
import { prisma } from "@/lib/db";
import { getSession, getSelectedBranchId, resolveBranchIdForOrganization, requireOrganization } from "@/lib/auth";
import { createInvoiceDocument } from "@/lib/pdf/BookInvoice";
import { requirePermission } from "@/lib/permissions";

async function nodeStreamToUint8Array(stream: Readable): Promise<Uint8Array> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return new Uint8Array(Buffer.concat(chunks));
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    requirePermission(session, "books", "read");
    requireOrganization(session);

    const orgId = session.organizationId!;
    const selectedBranchId = await getSelectedBranchId();
    const branchId = await resolveBranchIdForOrganization(orgId, selectedBranchId);

    const { id } = await params;

    const sale = await prisma.bookSale.findFirst({
      where: { id, organizationId: orgId, branchId },
      include: {
        items: { include: { product: true } },
        bookSet: { select: { id: true, name: true } },
        organization: { select: { id: true, name: true, logo: true, address: true, phone: true, email: true, website: true } },
      },
    });

    if (!sale) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

    const org = sale.organization;
    if (!org) return NextResponse.json({ error: "Missing organization" }, { status: 500 });

    const baseUrl =
      process.env.NEXTAUTH_URL ??
      process.env.NEXT_PUBLIC_BASE_URL ??
      "http://localhost:3000";
    const verificationUrl = `${baseUrl.replace(/\/$/, "")}/school/books`;
    const qrImage = await QRCode.toDataURL(verificationUrl);

    const doc = createInvoiceDocument(sale, org, qrImage);
    const pdfOutput = await pdf(doc).toBuffer();
    const pdfBytes =
      pdfOutput instanceof Uint8Array
        ? pdfOutput
        : pdfOutput instanceof ArrayBuffer
        ? new Uint8Array(pdfOutput)
        : pdfOutput instanceof Readable
        ? await nodeStreamToUint8Array(pdfOutput)
        : new Uint8Array(Buffer.from(pdfOutput as unknown as ArrayBuffer));

    const invoiceNo = sale.invoiceNo ?? sale.id.slice(0, 8);
    const dateStr = new Date(sale.soldAt ?? new Date()).toISOString().slice(0, 10);
    const filename = `Book-Invoice-${invoiceNo}-${dateStr}.pdf`;

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
    return NextResponse.json({ error: "Failed to generate invoice" }, { status: 500 });
  }
}