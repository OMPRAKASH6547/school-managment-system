import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { requireSchoolAdmin, requireOrganization } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const bodySchema = z.object({
  name: z.string().min(1),
  sku: z.string().nullable().optional(),
  price: z.number().min(0),
  stock: z.number().int().min(0),
  category: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    requireSchoolAdmin(session);
    requireOrganization(session);
    const orgId = session.organizationId!;
    const data = bodySchema.parse(await req.json());
    await prisma.bookProduct.create({
      data: {
        organizationId: orgId,
        name: data.name,
        sku: data.sku ?? null,
        price: data.price,
        stock: data.stock,
        category: data.category ?? null,
      },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: e.errors[0]?.message }, { status: 400 });
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
