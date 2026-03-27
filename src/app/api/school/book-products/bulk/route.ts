import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { getSelectedBranchId, requireOrganization, resolveBranchIdForOrganization } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/permissions";

const rowSchema = z.object({
  name: z.string().min(1),
  sku: z.string().nullable().optional(),
  price: z.number().min(0),
  stock: z.number().int().min(0),
  category: z.string().optional(),
});

const bodySchema = z.object({
  items: z.array(rowSchema).min(1),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    requirePermission(session, "books", "write");
    requireOrganization(session);
    const orgId = session.organizationId!;
    const branchId = await resolveBranchIdForOrganization(orgId, await getSelectedBranchId());
    const body = await req.json();
    const data = bodySchema.parse({
      items: (body.items ?? []).map((i: any) => ({
        ...i,
        price: Number(i.price),
        stock: Number(i.stock),
      })),
    });

    const results = await Promise.all(
      data.items.map(async (item) => {
        const sku = item.sku?.trim() || null;
        if (sku) {
          const existing = await prisma.bookProduct.findFirst({
            where: { organizationId: orgId, branchId, sku },
            select: { id: true },
          });
          if (existing) {
            await prisma.bookProduct.update({
              where: { id: existing.id },
              data: {
                name: item.name,
                price: item.price,
                stock: { increment: item.stock },
                category: item.category ?? null,
              },
            });
            return { type: "updated" as const };
          }
        }
        await prisma.bookProduct.create({
          data: {
            organizationId: orgId,
            branchId,
            name: item.name,
            sku,
            price: item.price,
            stock: item.stock,
            category: item.category ?? null,
          },
        });
        return { type: "created" as const };
      })
    );

    const created = results.filter((r) => r.type === "created").length;
    const updated = results.filter((r) => r.type === "updated").length;
    return NextResponse.json({ ok: true, created, updated });
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: e.errors[0]?.message }, { status: 400 });
    if (e instanceof Error && e.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
