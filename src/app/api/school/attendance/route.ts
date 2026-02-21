import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { requireSchoolAdmin, requireOrganization } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const bodySchema = z.object({
  date: z.string(),
  entries: z.array(z.object({
    studentId: z.string(),
    status: z.enum(["present", "absent", "late", "leave"]),
  })),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    requireSchoolAdmin(session);
    requireOrganization(session);
    const orgId = session.organizationId!;

    const data = bodySchema.parse(await req.json());
    const date = new Date(data.date);
    date.setHours(0, 0, 0, 0);

    for (const entry of data.entries) {
      const student = await prisma.student.findFirst({
        where: { id: entry.studentId, organizationId: orgId },
      });
      if (!student) continue;

      await prisma.attendance.upsert({
        where: {
          studentId_date: { studentId: entry.studentId, date },
        },
        create: {
          studentId: entry.studentId,
          date,
          status: entry.status,
        },
        update: { status: entry.status },
      });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.errors[0]?.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
