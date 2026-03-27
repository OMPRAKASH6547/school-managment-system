import { NextRequest, NextResponse } from "next/server";
import { getSession, getSelectedBranchId, resolveBranchIdForOrganization, requireOrganization } from "@/lib/auth";
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
    const cookieBranchId = await resolveBranchIdForOrganization(session.organizationId!, await getSelectedBranchId());
    const staffTeacher =
      session.role === "staff"
        ? await prisma.staff.findFirst({
            where: {
              email: session.email,
              organizationId: session.organizationId!,
              branchId: cookieBranchId,
              role: "teacher",
              status: "active",
            },
            select: { id: true, role: true },
          })
        : null;
    const isTeacherUser = session.role === "teacher" || !!staffTeacher;
    if (session.role !== "school_admin" && session.role !== "admin" && !isTeacherUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    const exam = await prisma.exam.findFirst({
      where: { id, organizationId: session.organizationId! },
    });
    if (!exam) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const classBranchId = exam.classId
      ? await prisma.class.findFirst({
          where: { id: exam.classId, organizationId: session.organizationId! },
          select: { branchId: true },
        })
      : null;
    const effectiveBranchId = classBranchId?.branchId ?? exam.branchId ?? cookieBranchId;

    // Teachers can only view marks for assigned classes.
    if (isTeacherUser) {
      if (!exam.classId) return NextResponse.json({ error: "Exam has no class" }, { status: 400 });
      const teacherStaff = staffTeacher
        ? staffTeacher
        : await prisma.staff.findFirst({
            where: { email: session.email, organizationId: session.organizationId!, branchId: effectiveBranchId },
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
          branchId: effectiveBranchId,
        },
        select: { id: true },
      });
      if (!assignment) return NextResponse.json({ error: "Not assigned" }, { status: 403 });
    }
    const results = await prisma.examResult.findMany({
      where: {
        examId: id,
        ...(effectiveBranchId ? { branchId: effectiveBranchId } : {}),
      },
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
    const cookieBranchId = await resolveBranchIdForOrganization(session.organizationId!, await getSelectedBranchId());
    const staffTeacher =
      session.role === "staff"
        ? await prisma.staff.findFirst({
            where: {
              email: session.email,
              organizationId: session.organizationId!,
              branchId: cookieBranchId,
              role: "teacher",
              status: "active",
            },
            select: { id: true, role: true },
          })
        : null;
    const isTeacherUser = session.role === "teacher" || !!staffTeacher;
    if (session.role !== "school_admin" && session.role !== "admin" && !isTeacherUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    const exam = await prisma.exam.findFirst({
      where: { id: examId, organizationId: session.organizationId! },
    });
    if (!exam) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!exam.classId) return NextResponse.json({ error: "Exam class is required" }, { status: 400 });

    const classBranchId = exam.classId
      ? await prisma.class.findFirst({
          where: { id: exam.classId, organizationId: session.organizationId! },
          select: { branchId: true },
        })
      : null;
    const effectiveBranchId = classBranchId?.branchId ?? exam.branchId ?? cookieBranchId;

    // Teachers can only enter marks for assigned classes.
    if (isTeacherUser) {
      if (!exam.classId) return NextResponse.json({ error: "Exam has no class" }, { status: 400 });
      const teacherStaff = staffTeacher
        ? staffTeacher
        : await prisma.staff.findFirst({
            where: { email: session.email, organizationId: session.organizationId!, branchId: effectiveBranchId },
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
          branchId: effectiveBranchId,
        },
        select: { id: true },
      });
      if (!assignment) return NextResponse.json({ error: "Not assigned" }, { status: 403 });
    }
    const body = await req.json();
    const { entries } = bodySchema.parse(body);

    // Enforce class-wise marks entry: only students from exam class can be updated.
    const validStudents = await prisma.student.findMany({
      where: {
        organizationId: session.organizationId!,
        classId: exam.classId,
        ...(effectiveBranchId ? { branchId: effectiveBranchId } : {}),
        id: { in: entries.map((e) => e.studentId) },
      },
      select: { id: true },
    });
    const validStudentIds = new Set(validStudents.map((s) => s.id));
    if (entries.length > 0 && validStudentIds.size === 0) {
      return NextResponse.json(
        { error: "No valid students found for this exam class in selected branch" },
        { status: 400 }
      );
    }

    for (const e of entries) {
      if (!validStudentIds.has(e.studentId)) continue;
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
          branchId: effectiveBranchId,
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
    if (err instanceof Error) {
      const msg = err.message ?? "Failed";
      const status = msg.includes("No organization") || msg.includes("Unauthorized") ? 403 : 500;
      return NextResponse.json({ error: msg }, { status });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    requireOrganization(session);
    const { id: examId } = await params;
    const cookieBranchId = await resolveBranchIdForOrganization(session.organizationId!, await getSelectedBranchId());
    if (session.role !== "school_admin" && session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    const exam = await prisma.exam.findFirst({
      where: { id: examId, organizationId: session.organizationId! },
      select: { id: true, classId: true, branchId: true },
    });
    if (!exam) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const classBranchId = exam.classId
      ? await prisma.class.findFirst({
          where: { id: exam.classId, organizationId: session.organizationId! },
          select: { branchId: true },
        })
      : null;
    const effectiveBranchId = classBranchId?.branchId ?? exam.branchId ?? cookieBranchId;

    await prisma.examResult.deleteMany({
      where: {
        examId,
        organizationId: session.organizationId!,
        ...(effectiveBranchId ? { branchId: effectiveBranchId } : {}),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Error) {
      const msg = err.message ?? "Failed";
      const status = msg.includes("No organization") || msg.includes("Unauthorized") ? 403 : 500;
      return NextResponse.json({ error: msg }, { status });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
