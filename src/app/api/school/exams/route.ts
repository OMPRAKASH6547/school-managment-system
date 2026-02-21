import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { requireSchoolAdmin, requireOrganization } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const bodySchema = z.object({
  organizationId: z.string(),
  name: z.string().min(1),
  examType: z.string(),
  classId: z.string().nullable().optional(),
  academicYear: z.string().optional(),
  subjects: z.array(z.object({ name: z.string().min(1), maxMarks: z.number() })),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    requireSchoolAdmin(session);
    requireOrganization(session);
    const body = await req.json();
    const data = bodySchema.parse(body);
    if (data.organizationId !== session.organizationId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const exam = await prisma.exam.create({
      data: {
        organizationId: data.organizationId,
        name: data.name,
        examType: data.examType,
        classId: data.classId ?? null,
        academicYear: data.academicYear ?? null,
        status: "draft",
        subjects: {
          create: data.subjects.map((s, i) => ({
            name: s.name,
            maxMarks: s.maxMarks,
            order: i,
          })),
        },
      },
      include: { subjects: true },
    });
    return NextResponse.json({ ok: true, id: exam.id });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.errors[0]?.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
