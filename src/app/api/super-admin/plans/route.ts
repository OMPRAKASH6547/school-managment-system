import { NextRequest, NextResponse } from "next/server";
import { getSession, requireSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { firstZodIssueMessage } from "@/lib/field-validation";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1).max(120),
  slug: z
    .string()
    .min(2)
    .max(64)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens"),
  description: z.string().max(2000).optional(),
  price: z.coerce.number().positive().max(1_000_000_000),
  maxStudents: z.coerce.number().int().min(1).max(1_000_000),
  maxStaff: z.coerce.number().int().min(1).max(100_000),
  isActive: z.coerce.boolean().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    requireSuperAdmin(session);
    const body = createSchema.parse(await req.json());

    const existing = await prisma.subscriptionPlan.findUnique({ where: { slug: body.slug } });
    if (existing) {
      return NextResponse.json({ error: "Slug already in use" }, { status: 400 });
    }

    const plan = await prisma.subscriptionPlan.create({
      data: {
        name: body.name.trim(),
        slug: body.slug.trim().toLowerCase(),
        description: body.description?.trim() || null,
        price: body.price,
        maxStudents: body.maxStudents,
        maxStaff: body.maxStaff,
        isActive: body.isActive ?? true,
      },
      select: { id: true, slug: true, name: true },
    });
    return NextResponse.json({ ok: true, plan });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: firstZodIssueMessage(e) }, { status: 400 });
    }
    if (e instanceof Error && e.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    console.error("[super-admin plans POST]", e);
    return NextResponse.json({ error: "Failed to create plan" }, { status: 500 });
  }
}
