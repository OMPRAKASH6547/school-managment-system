import { NextRequest, NextResponse } from "next/server";
import { pdf } from "@react-pdf/renderer";
import QRCode from "qrcode";
import { Readable } from "node:stream";
import { prisma } from "@/lib/db";
import { getSession, getSelectedBranchId, resolveBranchIdForOrganization, requireOrganization } from "@/lib/auth";
import { createAdmissionReceiptDocument } from "@/lib/pdf/AdmissionReceipt";
import { loadImageDataUriForPdf } from "@/lib/pdf/loadImageForPdf";
import { pdfThemeFromAccent } from "@/lib/pdf/pdfTheme";
import { requirePermission } from "@/lib/permissions";

async function nodeStreamToUint8Array(stream: Readable): Promise<Uint8Array> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return new Uint8Array(Buffer.concat(chunks));
}

async function webStreamToUint8Array(stream: ReadableStream<Uint8Array>): Promise<Uint8Array> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      total += value.length;
    }
  }
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }
  return merged;
}

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
        organization: {
          select: { name: true, logo: true, address: true, phone: true, email: true, pdfAccentColor: true },
        },
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

    const logoDataUri = await loadImageDataUriForPdf(payment.organization.logo);
    const pdfTheme = pdfThemeFromAccent(payment.organization.pdfAccentColor);

    const doc = createAdmissionReceiptDocument({
      org: payment.organization,
      logoDataUri,
      pdfTheme,
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

    const pdfOutput = await pdf(doc).toBuffer();
    let pdfBytes: Uint8Array;
    if (pdfOutput instanceof Uint8Array) {
      pdfBytes = pdfOutput;
    } else if (pdfOutput instanceof ArrayBuffer) {
      pdfBytes = new Uint8Array(pdfOutput);
    } else if (pdfOutput instanceof Readable) {
      pdfBytes = await nodeStreamToUint8Array(pdfOutput);
    } else if (
      typeof pdfOutput === "object" &&
      pdfOutput !== null &&
      "getReader" in pdfOutput &&
      typeof (pdfOutput as unknown as ReadableStream<Uint8Array>).getReader === "function"
    ) {
      pdfBytes = await webStreamToUint8Array(pdfOutput as unknown as ReadableStream<Uint8Array>);
    } else {
      throw new Error("Unsupported PDF output type");
    }

    const studentNameSafe = `${payment.student.firstName}-${payment.student.lastName}`.replace(/\s+/g, "-");
    const filename = `${studentNameSafe}_admission_receipt.pdf`;

    return new NextResponse(pdfBytes, {
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

