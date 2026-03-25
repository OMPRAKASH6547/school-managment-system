import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import QRCode from "qrcode";
import { pdf } from "@react-pdf/renderer";
import { prisma } from "@/lib/db";
import { getSession, getSelectedBranchId, requireBranchAccess, requireOrganization } from "@/lib/auth";
import { createInvoiceDocument } from "@/lib/pdf/BookInvoice";
import { requirePermission } from "@/lib/permissions";

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
    const branchId = await requireBranchAccess(orgId, selectedBranchId);

    const { id } = await params;

    const sale = await prisma.bookSale.findFirst({
      where: { id, organizationId: orgId, branchId },
      include: {
        items: { include: { product: true } },
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
    const pdfBuffer = await pdf(doc).toBuffer();

    const invoiceNo = sale.invoiceNo ?? sale.id.slice(0, 8);
    const dateStr = new Date(sale.soldAt ?? new Date()).toISOString().slice(0, 10);
    const filename = `Book-Invoice-${invoiceNo}-${dateStr}.pdf`;

    return new NextResponse(pdfBuffer as any, {
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