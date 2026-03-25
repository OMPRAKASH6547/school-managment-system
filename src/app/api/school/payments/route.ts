import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSelectedBranchId, requireBranchAccess, requireOrganization } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { requirePermission } from "@/lib/permissions";

const bodySchema = z.object({
  organizationId: z.string(),
  studentId: z.string(),
  amount: z.number().positive(),
  method: z.string().min(1),
  reference: z.string().nullable().optional(),
  feePlanId: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    requirePermission(session, "fees", "write");
    requireOrganization(session);
    const body = await req.json();
    const data = bodySchema.parse({
      ...body,
      amount: Number(body.amount),
    });
    if (data.organizationId !== session.organizationId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const branchId = await requireBranchAccess(session.organizationId!, await getSelectedBranchId());

    const student = await prisma.student.findFirst({
      where: { id: data.studentId, organizationId: session.organizationId!, branchId },
      select: { id: true, branchId: true },
    });
    if (!student) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    await prisma.payment.create({
      data: {
        organizationId: data.organizationId,
        branchId,
        studentId: data.studentId,
        amount: data.amount,
        method: data.method,
        reference: data.reference ?? null,
        feePlanId: data.feePlanId ?? null,
        notes: data.notes ?? null,
        status: "pending", // receipt downloadable only after admin verifies
      },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.errors[0]?.message }, { status: 400 });
    }
    if (e instanceof Error && e.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
