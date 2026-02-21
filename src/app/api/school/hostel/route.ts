import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { requireSchoolAdmin, requireOrganization } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const bodySchema = z.object({
  name: z.string().min(1),
  capacity: z.number().int().min(1),
  floor: z.string().nullable().optional(),
  rent: z.number().nullable().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    requireSchoolAdmin(session);
    requireOrganization(session);
    const orgId = session.organizationId!;
    const data = bodySchema.parse(await req.json());
    await prisma.hostelRoom.create({
      data: {
        organizationId: orgId,
        name: data.name,
        capacity: data.capacity,
        floor: data.floor ?? null,
        rent: data.rent ?? null,
      },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: e.errors[0]?.message }, { status: 400 });
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
