import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession, getSelectedBranchId, requireOrganization, resolveBranchIdForOrganization } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/permissions";

const bodySchema = z.object({
  name: z.string().min(1),
  sku: z.string().nullable().optional(),
  price: z.number().min(0),
  stock: z.number().int().min(0),
  category: z.string().nullable().optional(),
  status: z.string().optional(),
});

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    requirePermission(session, "books", "write");
    requireOrganization(session);
    const orgId = session.organizationId!;
    const branchId = await resolveBranchIdForOrganization(orgId, await getSelectedBranchId());
    const { id } = await params;
    const data = bodySchema.parse(await req.json());

    const existing = await prisma.bookProduct.findFirst({
      where: { id, organizationId: orgId, branchId },
      select: { id: true },
    });
    if (!existing) return NextResponse.json({ error: "Product not found" }, { status: 404 });

    await prisma.bookProduct.update({
      where: { id },
      data: {
        name: data.name,
        sku: data.sku ?? null,
        price: data.price,
        stock: data.stock,
        category: data.category ?? null,
        status: data.status ?? "active",
      },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: e.errors[0]?.message }, { status: 400 });
    if (e instanceof Error && e.message.includes("Unauthorized")) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    requirePermission(session, "books", "write");
    requireOrganization(session);
    const orgId = session.organizationId!;
    const branchId = await resolveBranchIdForOrganization(orgId, await getSelectedBranchId());
    const { id } = await params;

    const product = await prisma.bookProduct.findFirst({
      where: { id, organizationId: orgId, branchId },
      select: { id: true },
    });
    if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

    await prisma.$transaction(async (tx) => {
      await tx.bookSetItem.deleteMany({ where: { productId: id } });
      const usedInSales = await tx.bookSaleItem.count({ where: { productId: id } });
      if (usedInSales > 0) {
        await tx.bookProduct.update({ where: { id }, data: { status: "inactive" } });
      } else {
        await tx.bookProduct.delete({ where: { id } });
      }
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Error && e.message.includes("Unauthorized")) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
