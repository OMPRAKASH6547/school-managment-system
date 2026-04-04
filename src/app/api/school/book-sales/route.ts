import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSelectedBranchId, resolveBranchIdForOrganization, requireOrganization } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { requirePermission } from "@/lib/permissions";
import { notifyEmailAndWhatsApp } from "@/lib/notifications";
import { getSchoolNotifierEmails, studentFamilyPhones } from "@/lib/notification-recipients";
import { firstZodIssueMessage, LIMITS, zCuidId, zOptionalStr, zPhoneOpt } from "@/lib/field-validation";

const PAYMENT_METHODS = ["cash", "upi", "card", "bank_transfer", "cheque", "other"] as const;

const bodySchema = z.object({
  organizationId: zCuidId,
  studentId: z.preprocess((v) => (v === "" || v === undefined ? null : v), z.union([z.null(), zCuidId])),
  bookSetId: z.preprocess((v) => (v === "" || v === undefined ? null : v), z.union([z.null(), zCuidId])),
  customerName: zOptionalStr(LIMITS.personName),
  customerPhone: zPhoneOpt,
  paymentMethod: z.enum(PAYMENT_METHODS),
  items: z
    .array(
      z.object({
        productId: zCuidId,
        quantity: z.number().int().min(1).max(10_000),
      }),
    )
    .min(1)
    .max(200),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    requirePermission(session, "books", "write");
    requireOrganization(session);
    const orgId = session.organizationId!;
    const branchId = await resolveBranchIdForOrganization(orgId, await getSelectedBranchId());
    const data = bodySchema.parse(await req.json());
    if (data.organizationId !== orgId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    let studentId: string | null = null;
    let studentContact: {
      email: string | null;
      phone: string | null;
      motherPhone: string | null;
      guardianPhone: string | null;
      firstName: string;
      lastName: string;
    } | null = null;
    if (data.studentId) {
      const st = await prisma.student.findFirst({
        where: { id: data.studentId, organizationId: orgId, branchId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          motherPhone: true,
          guardianPhone: true,
        },
      });
      if (!st) return NextResponse.json({ error: "Invalid student" }, { status: 400 });
      studentId = st.id;
      studentContact = st;
    }

    let bookSetId: string | null = null;
    if (data.bookSetId) {
      const set = await prisma.bookSet.findFirst({
        where: { id: data.bookSetId, organizationId: orgId, branchId, isActive: true },
        select: { id: true },
      });
      if (!set) return NextResponse.json({ error: "Invalid book set" }, { status: 400 });
      bookSetId = set.id;
    }

    let totalAmount = 0;
    const saleItems: { productId: string; quantity: number; unitPrice: number; amount: number }[] = [];
    for (const item of data.items) {
      const product = await prisma.bookProduct.findFirst({
        where: { id: item.productId, organizationId: orgId, branchId },
      });
      if (!product) continue;
      const amount = product.price * item.quantity;
      totalAmount += amount;
      saleItems.push({
        productId: product.id,
        quantity: item.quantity,
        unitPrice: product.price,
        amount,
      });
    }
    if (saleItems.length === 0) return NextResponse.json({ error: "No valid items" }, { status: 400 });

    // Always tie the sale to the logged-in user (same name as login / session).
    const paymentAcceptedByName = (session.name?.trim() || session.email?.trim() || "Staff").slice(0, 200);

    const sellerStaff = await prisma.staff.findFirst({
      where: {
        organizationId: orgId,
        branchId,
        email: { equals: session.email, mode: "insensitive" },
        status: "active",
      },
      select: { id: true },
    });
    const paymentAcceptedByStaffId: string | null = sellerStaff?.id ?? null;

    const count = await prisma.bookSale.count({ where: { organizationId: orgId } });
    const invoiceNo = `INV-${String(count + 1).padStart(5, "0")}`;

    await prisma.bookSale.create({
      data: {
        organizationId: orgId,
        branchId,
        studentId,
        bookSetId,
        invoiceNo,
        totalAmount,
        customerName: data.customerName ?? null,
        customerPhone: data.customerPhone ?? null,
        paymentMethod: data.paymentMethod,
        paymentAcceptedByName,
        paymentAcceptedByStaffId,
        items: {
          create: saleItems.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            amount: i.amount,
            organizationId: orgId,
            branchId,
          })),
        },
      },
    });

    for (const item of saleItems) {
      await prisma.bookProduct.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.quantity } },
      });
    }

    const [org, adminEmails] = await Promise.all([
      prisma.organization.findUnique({
        where: { id: orgId },
        select: { name: true, email: true, phone: true },
      }),
      getSchoolNotifierEmails(orgId),
    ]);
    const phones: string[] = [];
    if (org?.phone) phones.push(org.phone);
    if (data.customerPhone) phones.push(data.customerPhone);
    if (studentContact) {
      phones.push(
        ...studentFamilyPhones({
          phone: studentContact.phone,
          motherPhone: studentContact.motherPhone,
          guardianPhone: studentContact.guardianPhone,
        })
      );
    }
    void notifyEmailAndWhatsApp({
      emails: [...adminEmails, org?.email, studentContact?.email].filter(Boolean) as string[],
      phones,
      subject: `Book sale: ${invoiceNo}`,
      html: `<p>Book shop sale recorded.</p>
        <p><strong>Invoice:</strong> ${invoiceNo}</p>
        <p><strong>Amount:</strong> INR ${totalAmount}</p>
        <p><strong>Payment:</strong> ${data.paymentMethod}</p>
        <p><strong>Customer:</strong> ${data.customerName ?? (studentContact ? `${studentContact.firstName} ${studentContact.lastName}` : "Walk-in")}</p>`,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: firstZodIssueMessage(e) }, { status: 400 });
    if (e instanceof Error && e.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
