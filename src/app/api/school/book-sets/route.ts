import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { getSelectedBranchId, requireOrganization, resolveBranchIdForOrganization } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/permissions";

const existingModeSchema = z.object({
  mode: z.literal("existing").optional(),
  classId: z.string().nullable().optional(),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  items: z.array(z.object({ productId: z.string().min(1), quantity: z.number().int().min(1) })).min(1),
});

const countTotalSchema = z.object({
  mode: z.literal("count_total"),
  classId: z.string().nullable().optional(),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  bookCount: z.number().int().min(1),
  totalPrice: z.number().positive(),
  items: z.array(z.object({ productId: z.string().min(1), quantity: z.number().int().min(1) })).optional(),
});

const bodySchema = z.union([existingModeSchema, countTotalSchema]);

function toSku(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    requirePermission(session, "books", "write");
    requireOrganization(session);
    const orgId = session.organizationId!;
    const branchId = await resolveBranchIdForOrganization(orgId, await getSelectedBranchId());
    const raw = await req.json();
    const parsed = bodySchema.parse({
      ...raw,
      items: (raw.items ?? []).map((i: any) => ({ productId: i.productId, quantity: Number(i.quantity) })),
      bookCount: raw.bookCount === undefined || raw.bookCount === null ? undefined : Number(raw.bookCount),
      totalPrice: raw.totalPrice === undefined || raw.totalPrice === null ? undefined : Number(raw.totalPrice),
    });

    if (parsed.classId) {
      const cls = await prisma.class.findFirst({
        where: { id: parsed.classId, organizationId: orgId, branchId },
        select: { id: true },
      });
      if (!cls) return NextResponse.json({ error: "Invalid class" }, { status: 400 });
    }

    if (parsed.mode === "count_total") {
      const totalPaise = Math.round(parsed.totalPrice * 100);
      const basePaise = Math.floor(totalPaise / parsed.bookCount);
      const remainder = totalPaise - basePaise * parsed.bookCount;

      await prisma.$transaction(async (tx) => {
        const set = await tx.bookSet.create({
          data: {
            organizationId: orgId,
            branchId,
            classId: parsed.classId ?? null,
            name: parsed.name,
            description: parsed.description ?? null,
            isActive: true,
          },
          select: { id: true },
        });

        for (let i = 0; i < parsed.bookCount; i++) {
          const price = (basePaise + (i < remainder ? 1 : 0)) / 100;
          const product = await tx.bookProduct.create({
            data: {
              organizationId: orgId,
              branchId,
              name: `${parsed.name} - Book ${i + 1}`,
              sku: toSku(`${parsed.name}-${i + 1}-${Date.now()}`),
              price,
              stock: 1000000,
              category: "set_item",
              status: "inactive",
            },
            select: { id: true },
          });
          await tx.bookSetItem.create({
            data: {
              setId: set.id,
              productId: product.id,
              quantity: 1,
              organizationId: orgId,
              branchId,
            },
          });
        }
      });
    } else {
      const validProducts = await prisma.bookProduct.findMany({
        where: { organizationId: orgId, branchId, id: { in: parsed.items.map((i) => i.productId) } },
        select: { id: true },
      });
      const validIds = new Set(validProducts.map((p) => p.id));
      if (parsed.items.some((i) => !validIds.has(i.productId))) {
        return NextResponse.json({ error: "One or more products are invalid" }, { status: 400 });
      }

      await prisma.bookSet.create({
        data: {
          organizationId: orgId,
          branchId,
          classId: parsed.classId ?? null,
          name: parsed.name,
          description: parsed.description ?? null,
          isActive: true,
          items: {
            create: parsed.items.map((i) => ({
              productId: i.productId,
              quantity: i.quantity,
              organizationId: orgId,
              branchId,
            })),
          },
        },
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
