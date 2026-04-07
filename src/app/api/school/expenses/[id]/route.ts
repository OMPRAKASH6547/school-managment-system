import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession, getSelectedBranchId, requireOrganization, resolveBranchIdForOrganization } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/permissions";
import { firstZodIssueMessage } from "@/lib/field-validation";

const updateSchema = z.object({
  title: z.string().trim().min(2).max(120),
  category: z.string().trim().max(60).optional(),
  amount: z.number().positive(),
  expenseDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  paymentMethod: z.string().trim().max(40).optional(),
  notes: z.string().trim().max(1000).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    requirePermission(session, "expenses", "write");
    requireOrganization(session);
    const orgId = session.organizationId!;
    const branchId = await resolveBranchIdForOrganization(orgId, await getSelectedBranchId());
    const { id } = await params;
    const raw = await req.json();
    const data = updateSchema.parse({ ...raw, amount: Number(raw?.amount) });
    const updated = await prisma.expense.updateMany({
      where: { id, organizationId: orgId, branchId },
      data: {
        title: data.title,
        category: data.category || null,
        amount: data.amount,
        expenseDate: new Date(data.expenseDate),
        paymentMethod: data.paymentMethod || null,
        notes: data.notes || null,
      },
    });
    if (!updated.count) return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: firstZodIssueMessage(e) }, { status: 400 });
    }
    if (e instanceof Error && e.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed to update expense" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    requirePermission(session, "expenses", "write");
    requireOrganization(session);
    const orgId = session.organizationId!;
    const branchId = await resolveBranchIdForOrganization(orgId, await getSelectedBranchId());
    const { id } = await params;
    const deleted = await prisma.expense.deleteMany({
      where: { id, organizationId: orgId, branchId },
    });
    if (!deleted.count) return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Error && e.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed to delete expense" }, { status: 500 });
  }
}
