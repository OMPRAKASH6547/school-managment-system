import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession, getSelectedBranchId, requireOrganization, resolveBranchIdForOrganization } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/permissions";

const bodySchema = z.object({
  classId: z.string().nullable().optional(),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  items: z.array(z.object({ productId: z.string().min(1), quantity: z.number().int().min(1) })).min(1),
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

    const set = await prisma.bookSet.findFirst({
      where: { id, organizationId: orgId, branchId },
      select: { id: true },
    });
    if (!set) return NextResponse.json({ error: "Set not found" }, { status: 404 });

    await prisma.$transaction(async (tx) => {
      await tx.bookSet.update({
        where: { id },
        data: {
          classId: data.classId ?? null,
          name: data.name,
          description: data.description ?? null,
          isActive: data.isActive ?? true,
        },
      });
      await tx.bookSetItem.deleteMany({ where: { setId: id } });
      await tx.bookSetItem.createMany({
        data: data.items.map((i) => ({
          setId: id,
          productId: i.productId,
          quantity: i.quantity,
          organizationId: orgId,
          branchId,
        })),
      });
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

    const set = await prisma.bookSet.findFirst({
      where: { id, organizationId: orgId, branchId },
      select: { id: true },
    });
    if (!set) return NextResponse.json({ error: "Set not found" }, { status: 404 });

    await prisma.$transaction(async (tx) => {
      await tx.bookSale.updateMany({ where: { bookSetId: id }, data: { bookSetId: null } });
      await tx.bookSetItem.deleteMany({ where: { setId: id } });
      await tx.bookSet.delete({ where: { id } });
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Error && e.message.includes("Unauthorized")) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
