import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { firstZodIssueMessage } from "@/lib/field-validation";

const bodySchema = z.object({
  planId: z.string().min(1),
  email: z.string().email(),
  name: z.string().max(120).optional(),
  phone: z.string().max(24).optional(),
  schoolName: z.string().max(120).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = bodySchema.parse(await req.json());
    const plan = await prisma.subscriptionPlan.findFirst({
      where: { id: body.planId, isActive: true },
      select: { id: true },
    });
    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }
    await prisma.subscriptionInquiry.create({
      data: {
        planId: body.planId,
        email: body.email.trim().toLowerCase(),
        name: body.name?.trim() || null,
        phone: body.phone?.trim() || null,
        schoolName: body.schoolName?.trim() || null,
        source: "demo",
      },
    });
    return NextResponse.json({ ok: true, message: "Demo request received. We will contact you shortly." });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: firstZodIssueMessage(e) }, { status: 400 });
    }
    console.error("[subscription-demo]", e);
    return NextResponse.json({ error: "Failed to save request" }, { status: 500 });
  }
}
