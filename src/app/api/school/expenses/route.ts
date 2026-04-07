import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession, getSelectedBranchId, requireOrganization, resolveBranchIdForOrganization } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/permissions";
import { firstZodIssueMessage } from "@/lib/field-validation";

const createSchema = z.object({
  title: z.string().trim().min(2).max(120),
  category: z.string().trim().max(60).optional(),
  amount: z.number().positive(),
  expenseDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  paymentMethod: z.string().trim().max(40).optional(),
  notes: z.string().trim().max(1000).optional(),
});

export async function GET(req: NextRequest) {
  const session = await getSession();
  requirePermission(session, "expenses", "read");
  requireOrganization(session);
  const orgId = session.organizationId!;
  const branchId = await resolveBranchIdForOrganization(orgId, await getSelectedBranchId());
  const sp = req.nextUrl.searchParams;
  const q = (sp.get("q") || "").trim();
  const category = (sp.get("category") || "").trim();
  const from = (sp.get("from") || "").trim();
  const to = (sp.get("to") || "").trim();
  const page = Math.max(1, Number(sp.get("page") || "1"));
  const pageSize = Math.min(50, Math.max(1, Number(sp.get("pageSize") || "10")));
  const skip = (page - 1) * pageSize;

  const where: Record<string, unknown> = {
    organizationId: orgId,
    branchId,
    ...(category ? { category } : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q } },
            { notes: { contains: q } },
          ],
        }
      : {}),
    ...((from || to)
      ? {
          expenseDate: {
            ...(from ? { gte: new Date(`${from}T00:00:00.000Z`) } : {}),
            ...(to ? { lte: new Date(`${to}T23:59:59.999Z`) } : {}),
          },
        }
      : {}),
  };

  const [rows, total, agg] = await Promise.all([
    prisma.expense.findMany({
      where,
      orderBy: { expenseDate: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.expense.count({ where }),
    prisma.expense.aggregate({ where, _sum: { amount: true } }),
  ]);

  return NextResponse.json({
    rows,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    totalAmount: agg._sum.amount ?? 0,
  });
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    requirePermission(session, "expenses", "write");
    requireOrganization(session);
    const orgId = session.organizationId!;
    const branchId = await resolveBranchIdForOrganization(orgId, await getSelectedBranchId());
    const raw = await req.json();
    const data = createSchema.parse({
      ...raw,
      amount: Number(raw?.amount),
    });

    const row = await prisma.expense.create({
      data: {
        organizationId: orgId,
        branchId,
        title: data.title,
        category: data.category || null,
        amount: data.amount,
        expenseDate: new Date(data.expenseDate),
        paymentMethod: data.paymentMethod || null,
        notes: data.notes || null,
        createdBy: session.id,
      },
    });
    return NextResponse.json({ ok: true, row });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: firstZodIssueMessage(e) }, { status: 400 });
    }
    if (e instanceof Error && e.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed to create expense" }, { status: 500 });
  }
}
