// app/api/invoice/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, requireSchoolAdmin, requireOrganization } from "@/lib/auth";
import { renderToBuffer } from "@react-pdf/renderer";
import { createInvoiceDocument } from "@/lib/pdf/BookInvoice";
import QRCode from "qrcode";

export const runtime = "nodejs";
// export const dynamic = "force-dynamic";   // uncomment if you want to force dynamic rendering

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Authentication & authorization
    const session = await getSession();
    requireSchoolAdmin(session);
    requireOrganization(session);

    if (!session.organizationId) {
      return NextResponse.json(
        { error: "Organization context required" },
        { status: 403 }
      );
    }

    // 2. Fetch sale with necessary relations
    const sale = await prisma.bookSale.findFirst({
      where: {
        id: params.id,
        organizationId: session.organizationId,
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        organization: true,
      },
    });

    if (!sale || !sale.organization) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }
    console.log(sale.organization, "sale.organization");
    // 3. Generate QR code as data URL
    const publicInvoiceUrl = `${process.env.NEXTAUTH_URL}/invoice/${sale.id}`;
    const qrImageDataUrl = await QRCode.toDataURL(publicInvoiceUrl, {
      margin: 1,
      width: 180,
      errorCorrectionLevel: "M",
    });

    // 4. Create the PDF document component
    const invoiceDoc = createInvoiceDocument(sale, sale.organization, qrImageDataUrl);

    // 5. Render PDF to Uint8Array
    const pdfUint8Array = await renderToBuffer(invoiceDoc);

    // 6. Convert to Node.js Buffer (removes most TS warnings + very reliable)
    const pdfBuffer = Buffer.from(pdfUint8Array);

    // 7. Return as downloadable PDF
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Length": pdfBuffer.length.toString(),
        "Content-Disposition": `attachment; filename="invoice-${sale.id}.pdf"`,
        // Prevent caching of dynamic invoices
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        // Optional: "Pragma": "no-cache",
        // Optional: "Expires": "0",
      },
    });
  } catch (err: any) {
    console.error("[PDF Invoice Generation Failed]", {
      invoiceId: params?.id,
      error: err?.message || String(err),
      stack: err?.stack,
    });

    return NextResponse.json(
      { error: "Failed to generate PDF invoice" },
      { status: 500 }
    );
  }
}