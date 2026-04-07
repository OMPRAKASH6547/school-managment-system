import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getLoggedInStudent } from "@/lib/student-auth";
import { StudentDashboardClient } from "./StudentDashboardClient";

function monthKey(d = new Date()) {
  return d.toISOString().slice(0, 7);
}

export default async function StudentDashboardPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getSession();
  if (!session) redirect("/student/login");
  if (session.role !== "student") redirect(session.role === "super_admin" ? "/super-admin" : "/school");

  const student = await getLoggedInStudent(session);
  if (!student) redirect("/student/login");

  const nowMonth = monthKey();
  const sp = (await searchParams) ?? {};
  const reviewsPage = Math.max(1, Number(typeof sp.reviewsPage === "string" ? sp.reviewsPage : "1") || 1);

  const [org, cls, attendance, examResults, feePlans, payments, liveRows, pastRows] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: student.organizationId },
      select: {
        name: true,
        paymentGatewayEnabled: true,
      },
    }),
    student.classId ? prisma.class.findUnique({ where: { id: student.classId }, select: { name: true } }) : Promise.resolve(null),
    prisma.attendance.findMany({
      where: { studentId: student.id },
      orderBy: { date: "desc" },
      take: 30,
      select: { date: true, status: true },
    }),
    prisma.examResult.findMany({
      where: { studentId: student.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { exam: { select: { name: true } }, subject: { select: { name: true, maxMarks: true } } },
    }),
    prisma.feePlan.findMany({
      where: {
        organizationId: student.organizationId,
        payerType: "student",
        isActive: true,
        OR: [{ branchId: student.branchId }, { branchId: null }],
      },
      orderBy: { name: "asc" },
      select: { id: true, name: true, amount: true, frequency: true, classId: true },
    }),
    prisma.payment.findMany({
      where: {
        studentId: student.id,
        feePeriodMonth: nowMonth,
        verifiedAt: { not: null },
      },
      select: { id: true, feePlanId: true, amount: true, paidAt: true, reference: true },
    }),
    prisma.teacherClassSession.findMany({
      where: {
        organizationId: student.organizationId,
        branchId: student.branchId ?? undefined,
        classId: student.classId ?? "__none__",
        endedAt: null,
      },
      orderBy: { startedAt: "desc" },
      take: 10,
      select: { id: true, teacherStaffId: true, startedAt: true, endedAt: true, classId: true },
    }),
    prisma.teacherClassSession.findMany({
      where: {
        organizationId: student.organizationId,
        branchId: student.branchId ?? undefined,
        classId: student.classId ?? "__none__",
        endedAt: { not: null },
      },
      orderBy: { startedAt: "desc" },
      take: 60,
      select: { id: true, teacherStaffId: true, startedAt: true, endedAt: true, classId: true },
    }),
  ]);

  const attendanceSummary = {
    present: attendance.filter((a) => a.status === "present").length,
    absent: attendance.filter((a) => a.status === "absent").length,
    late: attendance.filter((a) => a.status === "late").length,
    leave: attendance.filter((a) => a.status === "leave").length,
  };

  const applicableFeePlans = feePlans.filter((p) => !p.classId || p.classId === student.classId);
  const paidPlanIds = new Set(payments.map((p) => p.feePlanId).filter(Boolean));
  const teacherIds = Array.from(new Set([...liveRows, ...pastRows].map((s) => s.teacherStaffId)));
  const [teachers, reviews] = await Promise.all([
    teacherIds.length
      ? prisma.staff.findMany({
          where: { id: { in: teacherIds } },
          select: { id: true, firstName: true, lastName: true },
        })
      : Promise.resolve([]),
    prisma.classReview.findMany({
      where: { studentId: student.id, organizationId: student.organizationId, branchId: student.branchId ?? null },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
  ]);
  const teacherNameById = new Map(teachers.map((t) => [t.id, `${t.firstName} ${t.lastName}`.trim()]));
  const myReviewBySession = new Map(reviews.map((r) => [r.sessionId, r]));
  const avgByTeacher = new Map<string, number>();
  const avgBySubject = new Map<string, number>();
  const allReviews = await prisma.classReview.findMany({
    where: { organizationId: student.organizationId, branchId: student.branchId ?? null, classId: student.classId ?? undefined },
    select: { teacherStaffId: true, subjectName: true, rating: true },
  });
  for (const r of allReviews) {
    const tKey = r.teacherStaffId;
    const sKey = r.subjectName ?? "General";
    const t = avgByTeacher.get(tKey) ?? 0;
    const tc = avgByTeacher.get(`${tKey}#c`) ?? 0;
    avgByTeacher.set(tKey, t + r.rating);
    avgByTeacher.set(`${tKey}#c`, tc + 1);
    const s = avgBySubject.get(sKey) ?? 0;
    const sc = avgBySubject.get(`${sKey}#c`) ?? 0;
    avgBySubject.set(sKey, s + r.rating);
    avgBySubject.set(`${sKey}#c`, sc + 1);
  }
  const classSubjects = (await prisma.class.findUnique({ where: { id: student.classId ?? "__none__" }, select: { subjects: true } }))?.subjects ?? "";
  const defaultSubject = classSubjects.split(",").map((s) => s.trim()).filter(Boolean)[0] ?? "General";
  const mapSession = (s: (typeof liveRows)[number] | (typeof pastRows)[number], status: "Ongoing" | "Completed") => {
    const teacherName = teacherNameById.get(s.teacherStaffId) ?? "Teacher";
    const subjectName = defaultSubject;
    const tSum = avgByTeacher.get(s.teacherStaffId) ?? 0;
    const tCnt = avgByTeacher.get(`${s.teacherStaffId}#c`) ?? 0;
    const sSum = avgBySubject.get(subjectName) ?? 0;
    const sCnt = avgBySubject.get(`${subjectName}#c`) ?? 0;
    return {
      id: s.id,
      subjectName,
      teacherName,
      startedAt: s.startedAt.toISOString(),
      endedAt: s.endedAt ? s.endedAt.toISOString() : null,
      status,
      avgTeacherRating: tCnt ? tSum / tCnt : null,
      avgSubjectRating: sCnt ? sSum / sCnt : null,
      myReviewId: myReviewBySession.get(s.id)?.id ?? null,
    };
  };

  const reviewRows = reviews.map((r) => ({
    id: r.id,
    sessionId: r.sessionId,
    subjectName: r.subjectName ?? defaultSubject,
    teacherName: teacherNameById.get(r.teacherStaffId) ?? "Teacher",
    rating: r.rating,
    comment: r.comment,
    tags: Array.isArray(r.tags) ? (r.tags as string[]) : [],
    createdAt: r.createdAt.toISOString(),
  }));
  const reviewPageSize = 10;
  const reviewPageSlice = reviewRows.slice((reviewsPage - 1) * reviewPageSize, reviewsPage * reviewPageSize);

  return <StudentDashboardClient
    studentName={student.firstName}
    profile={{ rollNo: student.rollNo ?? null, phone: student.phone ?? null, className: cls?.name ?? null, schoolName: org?.name ?? null }}
    attendanceSummary={attendanceSummary}
    marks={examResults.map((r) => ({ exam: r.exam?.name ?? "—", subject: r.subject?.name ?? "—", marks: r.marksObtained, maxMarks: r.subject?.maxMarks ?? 0 }))}
    liveSessions={liveRows.map((s) => mapSession(s, "Ongoing"))}
    pastSessions={pastRows.map((s) => mapSession(s, "Completed"))}
    reviews={reviewPageSlice}
    reviewPageInfo={{ page: reviewsPage, totalPages: Math.max(1, Math.ceil(reviewRows.length / reviewPageSize)) }}
    nowMonth={nowMonth}
    feeRows={applicableFeePlans.map((f) => ({ id: f.id, name: f.name, amount: f.amount, frequency: f.frequency, paid: paidPlanIds.has(f.id), canPayOnline: !!org?.paymentGatewayEnabled }))}
  />;
}
