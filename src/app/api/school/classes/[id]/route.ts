import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { requireSchoolAdmin, requireOrganization } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const bodySchema = z.object({
  name: z.string().min(1),
  section: z.string().optional(),
  academicYear: z.string().optional(),
  capacity: z.number().nullable().optional(),
  room: z.string().optional(),
  status: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    requireSchoolAdmin(session);
    requireOrganization(session);
    const { id } = await params;
    const cls = await prisma.class.findFirst({
      where: { id, organizationId: session.organizationId! },
    });
    if (!cls) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const raw = await req.json();
    const data = bodySchema.parse({
      ...raw,
      capacity: raw.capacity != null ? Number(raw.capacity) : null,
    });

    await prisma.class.update({
      where: { id },
      data: {
        name: data.name,
        section: data.section ?? null,
        academicYear: data.academicYear ?? null,
        capacity: data.capacity ?? null,
        room: data.room ?? null,
        status: data.status ?? cls.status,
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
