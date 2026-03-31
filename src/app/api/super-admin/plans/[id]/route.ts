import { NextRequest, NextResponse } from "next/server";
import { getSession, requireSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { firstZodIssueMessage } from "@/lib/field-validation";
import { z } from "zod";

const updateSchema = z.object({
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
  isActive: z.coerce.boolean(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    requireSuperAdmin(session);
    const body = updateSchema.parse(await req.json());
    const { id } = await params;

    const existing = await prisma.subscriptionPlan.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    const normalizedSlug = body.slug.trim().toLowerCase();
    const slugClash = await prisma.subscriptionPlan.findFirst({
      where: { slug: normalizedSlug, id: { not: id } },
      select: { id: true },
    });
    if (slugClash) {
      return NextResponse.json({ error: "Slug already in use" }, { status: 400 });
    }

    await prisma.subscriptionPlan.update({
      where: { id },
      data: {
        name: body.name.trim(),
        slug: normalizedSlug,
        description: body.description?.trim() || null,
        price: body.price,
        maxStudents: body.maxStudents,
        maxStaff: body.maxStaff,
        isActive: body.isActive,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: firstZodIssueMessage(e) }, { status: 400 });
    }
    if (e instanceof Error && e.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    console.error("[super-admin plans PATCH]", e);
    return NextResponse.json({ error: "Failed to update plan" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    requireSuperAdmin(session);
    const { id } = await params;

    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id },
      select: { id: true, _count: { select: { subscriptions: true } } },
    });
    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }
    if (plan._count.subscriptions > 0) {
      return NextResponse.json(
        { error: "Cannot delete a plan with subscriptions. Set it inactive instead." },
        { status: 400 }
      );
    }

    await prisma.subscriptionPlan.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Error && e.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    console.error("[super-admin plans DELETE]", e);
    return NextResponse.json({ error: "Failed to delete plan" }, { status: 500 });
  }
}
