import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { requireSchoolAdmin, requireOrganization } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    requireSchoolAdmin(session);
    requireOrganization(session);
    const { id } = await params;
    const exam = await prisma.exam.findFirst({
      where: { id, organizationId: session.organizationId! },
    });
    if (!exam) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const results = await prisma.examResult.findMany({
      where: { examId: id },
      select: { studentId: true, subjectId: true, marksObtained: true },
    });
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

const bodySchema = z.object({
  entries: z.array(z.object({
    studentId: z.string(),
    subjectId: z.string(),
    marksObtained: z.number(),
  })),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    requireSchoolAdmin(session);
    requireOrganization(session);
    const { id: examId } = await params;
    const exam = await prisma.exam.findFirst({
      where: { id: examId, organizationId: session.organizationId! },
    });
    if (!exam) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const body = await req.json();
    const { entries } = bodySchema.parse(body);

    for (const e of entries) {
      await prisma.examResult.upsert({
        where: {
          examId_studentId_subjectId: {
            examId,
            studentId: e.studentId,
            subjectId: e.subjectId,
          },
        },
        create: {
          examId,
          studentId: e.studentId,
          subjectId: e.subjectId,
          marksObtained: e.marksObtained,
        },
        update: { marksObtained: e.marksObtained },
      });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0]?.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
