import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { requireSchoolAdmin, requireOrganization } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const bodySchema = z.object({
  name: z.string().min(1),
  amount: z.number().positive(),
  frequency: z.enum(["one_time", "monthly", "quarterly", "yearly"]),
  classId: z.string().nullable().optional(),
  dueDay: z.number().min(1).max(31).nullable().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    requireSchoolAdmin(session);
    requireOrganization(session);
    const orgId = session.organizationId!;

    const raw = await req.json();
    const data = bodySchema.parse({
      ...raw,
      amount: Number(raw.amount),
      dueDay: raw.dueDay != null ? Number(raw.dueDay) : null,
    });

    await prisma.feePlan.create({
      data: {
        organizationId: orgId,
        name: data.name,
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
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
