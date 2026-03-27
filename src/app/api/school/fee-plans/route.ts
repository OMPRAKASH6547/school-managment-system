import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSelectedBranchId, resolveBranchIdForOrganization, requireOrganization } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { requirePermission } from "@/lib/permissions";

const bodySchema = z.object({
  name: z.string().min(1),
  payerType: z.enum(["student", "staff"]).default("student"),
  amount: z.number().positive(),
  frequency: z.enum(["one_time", "monthly", "quarterly", "yearly"]),
  classId: z.string().nullable().optional(),
  dueDay: z.number().min(1).max(31).nullable().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    requirePermission(session, "fees.plans", "write");
    requireOrganization(session);
    const orgId = session.organizationId!;
    const branchId = await resolveBranchIdForOrganization(orgId, await getSelectedBranchId());

    const raw = await req.json();
    const data = bodySchema.parse({
      ...raw,
      amount: Number(raw.amount),
      dueDay: raw.dueDay != null ? Number(raw.dueDay) : null,
    });

    await prisma.feePlan.create({
      data: {
        organizationId: orgId,
        branchId,
        name: data.name,
        payerType: data.payerType,
        amount: data.amount,
        frequency: data.frequency,
        classId: data.classId ?? null,
        dueDay: data.dueDay ?? null,
        isActive: true,
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
