import { NextRequest, NextResponse } from "next/server";
import { getSession, getSelectedBranchId, requireBranchAccess, requireOrganization } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    requireOrganization(session);
    const { id } = await params;
    const branchId = await requireBranchAccess(session.organizationId!, await getSelectedBranchId());
    if (session.role !== "school_admin" && session.role !== "admin" && session.role !== "teacher") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    const exam = await prisma.exam.findFirst({
      where: { id, organizationId: session.organizationId!, branchId },
    });
    if (!exam) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Teachers can only view marks for assigned classes.
    if (session.role === "teacher") {
      if (!exam.classId) return NextResponse.json({ error: "Exam has no class" }, { status: 400 });
      const teacherStaff = await prisma.staff.findFirst({
        where: { email: session.email, organizationId: session.organizationId!, branchId },
        select: { id: true, role: true },
      });
      if (!teacherStaff || teacherStaff.role !== "teacher") {
        return NextResponse.json({ error: "Teacher not found" }, { status: 403 });
      }
      const assignment = await prisma.teacherAssignment.findFirst({
        where: {
          teacherStaffId: teacherStaff.id,
          classId: exam.classId,
          organizationId: session.organizationId!,
          branchId,
        },
        select: { id: true },
      });
      if (!assignment) return NextResponse.json({ error: "Not assigned" }, { status: 403 });
    }
    const results = await prisma.examResult.findMany({
      where: { examId: id, branchId },
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
    requireOrganization(session);
    const { id: examId } = await params;
    const branchId = await requireBranchAccess(session.organizationId!, await getSelectedBranchId());
    if (session.role !== "school_admin" && session.role !== "admin" && session.role !== "teacher") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    const exam = await prisma.exam.findFirst({
      where: { id: examId, organizationId: session.organizationId!, branchId },
    });
    if (!exam) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Teachers can only enter marks for assigned classes.
    if (session.role === "teacher") {
      if (!exam.classId) return NextResponse.json({ error: "Exam has no class" }, { status: 400 });
      const teacherStaff = await prisma.staff.findFirst({
        where: { email: session.email, organizationId: session.organizationId!, branchId },
        select: { id: true, role: true },
      });
      if (!teacherStaff || teacherStaff.role !== "teacher") {
        return NextResponse.json({ error: "Teacher not found" }, { status: 403 });
      }
      const assignment = await prisma.teacherAssignment.findFirst({
        where: {
          teacherStaffId: teacherStaff.id,
          classId: exam.classId,
          organizationId: session.organizationId!,
          branchId,
        },
        select: { id: true },
      });
      if (!assignment) return NextResponse.json({ error: "Not assigned" }, { status: 403 });
    }
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
          organizationId: session.organizationId!,
          branchId,
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
