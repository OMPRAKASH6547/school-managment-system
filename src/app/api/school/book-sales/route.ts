import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSelectedBranchId, requireBranchAccess, requireOrganization } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { requirePermission } from "@/lib/permissions";

const bodySchema = z.object({
  organizationId: z.string(),
  customerName: z.string().nullable().optional(),
  customerPhone: z.string().nullable().optional(),
  items: z.array(z.object({ productId: z.string(), quantity: z.number().int().min(1) })),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    requirePermission(session, "books", "write");
    requireOrganization(session);
    const orgId = session.organizationId!;
    const branchId = await requireBranchAccess(orgId, await getSelectedBranchId());
    const data = bodySchema.parse(await req.json());
    if (data.organizationId !== orgId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

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

    const count = await prisma.bookSale.count({ where: { organizationId: orgId } });
    const invoiceNo = `INV-${String(count + 1).padStart(5, "0")}`;

    await prisma.bookSale.create({
      data: {
        organizationId: orgId,
        branchId,
        invoiceNo,
        totalAmount,
        customerName: data.customerName ?? null,
        customerPhone: data.customerPhone ?? null,
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

    for (const item of data.items) {
      await prisma.bookProduct.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.quantity } },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: e.errors[0]?.message }, { status: 400 });
    if (e instanceof Error && e.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
