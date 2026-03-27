import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { getSelectedBranchId, requireOrganization, resolveBranchIdForOrganization } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/permissions";

const bodySchema = z.object({
  scanCode: z.string().min(1),
  name: z.string().optional(),
  price: z.number().min(0).optional(),
  category: z.string().optional(),
  addStock: z.number().int().min(1).default(1),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    requirePermission(session, "books", "write");
    requireOrganization(session);
    const orgId = session.organizationId!;
    const branchId = await resolveBranchIdForOrganization(orgId, await getSelectedBranchId());
    const raw = await req.json();
    const data = bodySchema.parse({
      ...raw,
      price: raw.price != null ? Number(raw.price) : undefined,
      addStock: raw.addStock != null ? Number(raw.addStock) : 1,
    });

    const scanCode = data.scanCode.trim();
    const existing = await prisma.bookProduct.findFirst({
      where: { organizationId: orgId, branchId, sku: scanCode },
      select: { id: true, name: true },
    });
    if (existing) {
      await prisma.bookProduct.update({
        where: { id: existing.id },
        data: { stock: { increment: data.addStock } },
      });
      return NextResponse.json({ ok: true, action: "updated", productName: existing.name });
    }

    if (!data.name || data.price == null) {
      return NextResponse.json(
        { error: "New scanned item needs name and price." },
        { status: 400 }
      );
    }

    const created = await prisma.bookProduct.create({
      data: {
        organizationId: orgId,
        branchId,
        name: data.name,
        sku: scanCode,
        price: data.price,
        stock: data.addStock,
        category: data.category ?? "book",
      },
      select: { id: true, name: true },
    });
    return NextResponse.json({ ok: true, action: "created", productName: created.name });
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: e.errors[0]?.message }, { status: 400 });
    if (e instanceof Error && e.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
