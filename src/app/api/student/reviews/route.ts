import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getLoggedInStudent } from "@/lib/student-auth";

const createSchema = z.object({
  sessionId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().min(3).max(1000),
  tags: z.array(z.string().trim().min(1).max(40)).max(8).optional(),
});

function dayStart(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  const student = await getLoggedInStudent(session);
  if (!student) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const page = Math.max(1, Number(sp.get("page") || "1"));
  const pageSize = Math.min(20, Math.max(1, Number(sp.get("pageSize") || "10")));
  const skip = (page - 1) * pageSize;

  const [rows, total] = await Promise.all([
    prisma.classReview.findMany({
      where: { studentId: student.id, organizationId: student.organizationId, branchId: student.branchId ?? null },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.classReview.count({
      where: { studentId: student.id, organizationId: student.organizationId, branchId: student.branchId ?? null },
    }),
  ]);
  return NextResponse.json({ rows, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) });
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    const student = await getLoggedInStudent(session);
    if (!student) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const data = createSchema.parse(await req.json());
    const classSession = await prisma.teacherClassSession.findFirst({
      where: {
        id: data.sessionId,
        organizationId: student.organizationId,
        branchId: student.branchId ?? undefined,
        classId: student.classId ?? undefined,
      },
      select: { id: true, classId: true, teacherStaffId: true, startedAt: true, endedAt: true },
    });
    if (!classSession) return NextResponse.json({ error: "Class not found for student" }, { status: 404 });
    if (!classSession.endedAt) return NextResponse.json({ error: "Review can be submitted after class ends" }, { status: 400 });

    const attended = await prisma.attendance.findFirst({
      where: {
        studentId: student.id,
        date: dayStart(classSession.startedAt),
        status: { in: ["present", "late"] },
      },
      select: { id: true },
    });
    if (!attended) {
      return NextResponse.json({ error: "You can review only classes you attended" }, { status: 403 });
    }

    const cls = await prisma.class.findUnique({ where: { id: classSession.classId }, select: { subjects: true } });
    const subjectName = (cls?.subjects ?? "").split(",").map((s) => s.trim()).filter(Boolean)[0] ?? "General";

    const exists = await prisma.classReview.findFirst({
      where: { studentId: student.id, sessionId: classSession.id },
      select: { id: true },
    });
    if (exists) return NextResponse.json({ error: "Review already submitted for this class" }, { status: 409 });

    const created = await prisma.classReview.create({
      data: {
        organizationId: student.organizationId,
        branchId: student.branchId ?? null,
        studentId: student.id,
        sessionId: classSession.id,
        classId: classSession.classId,
        teacherStaffId: classSession.teacherStaffId,
        subjectName,
        rating: data.rating,
        comment: data.comment,
        tags: data.tags ?? [],
      },
    });
    return NextResponse.json({ ok: true, review: created });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to save review" }, { status: 500 });
  }
}
