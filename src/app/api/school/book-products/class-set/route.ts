import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { getSelectedBranchId, requireOrganization, resolveBranchIdForOrganization } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/permissions";

const itemSchema = z.object({
  name: z.string().min(1),
  price: z.number().min(0),
  stock: z.number().int().min(0),
  category: z.string().optional(),
});

const bodySchema = z.object({
  classId: z.string().min(1),
  setName: z.string().nullable().optional(),
  items: z.array(itemSchema).min(1),
});

function toSku(text: string) {
  return text
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
}

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
      items: (raw.items ?? []).map((i: any) => ({
        ...i,
        price: Number(i.price),
        stock: Number(i.stock),
      })),
    });

    const cls = await prisma.class.findFirst({
      where: { id: data.classId, organizationId: orgId, branchId },
      select: { id: true, name: true },
    });
    if (!cls) return NextResponse.json({ error: "Class not found" }, { status: 404 });

    const setName = data.setName?.trim() || "";
    const label = `${cls.name}${setName ? `-${setName}` : ""}`;

    let created = 0;
    let updated = 0;
    for (let idx = 0; idx < data.items.length; idx++) {
      const item = data.items[idx];
      const productName = `${cls.name} - ${item.name.trim()}`;
      const sku = toSku(`${label}-${item.name}-${idx + 1}`);
      const existing = await prisma.bookProduct.findFirst({
        where: { organizationId: orgId, branchId, name: productName },
        select: { id: true },
      });
      if (existing) {
        updated += 1;
        await prisma.bookProduct.update({
          where: { id: existing.id },
          data: {
            price: item.price,
            stock: { increment: item.stock },
            category: item.category ?? "book",
          },
        });
        continue;
      }
      created += 1;
      await prisma.bookProduct.create({
        data: {
          organizationId: orgId,
          branchId,
          name: productName,
          sku,
          price: item.price,
          stock: item.stock,
          category: item.category ?? "book",
        },
      });
    }

    return NextResponse.json({ ok: true, created, updated });
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: e.errors[0]?.message }, { status: 400 });
    if (e instanceof Error && e.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    const message = e instanceof Error ? e.message : "Failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
