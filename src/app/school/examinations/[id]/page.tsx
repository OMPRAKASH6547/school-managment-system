import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession, getResolvedBranchIdForSchool } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { MarksEntryForm } from "@/app/components/MarksEntryForm";

export default async function ExamDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  const orgId = session?.organizationId!;
  const cookieBranchId = await getResolvedBranchIdForSchool(session);
  const { id } = await params;
  const staffTeacher =
    session?.role === "staff"
      ? await prisma.staff.findFirst({
          where: {
            email: session.email,
            organizationId: orgId,
            branchId: cookieBranchId,
            role: "teacher",
            status: "active",
          },
          select: { id: true, role: true },
        })
      : null;
  const isTeacherUser = session?.role === "teacher" || !!staffTeacher;

  if (session?.role === "staff" && !staffTeacher) redirect("/school/staff-attendance");
  if (session?.role === "accountant") redirect("/school");

  const exam = await prisma.exam.findFirst({
    where: { id, organizationId: orgId },
    include: {
      subjects: { orderBy: { order: "asc" } },
      results: true,
    },
  });
  if (!exam) notFound();

  // Use the exam class's branch as the source of truth for marks entry.
  const classBranchId = exam.classId
    ? await prisma.class.findFirst({
        where: { id: exam.classId, organizationId: orgId },
        select: { branchId: true },
      })
    : null;
  const effectiveBranchId = classBranchId?.branchId ?? exam.branchId ?? cookieBranchId;

  // Teacher can only view/manage marks for classes they are assigned to.
  if (isTeacherUser) {
    if (!exam.classId || !effectiveBranchId) return notFound();
    const teacherStaff = staffTeacher
      ? staffTeacher
      : await prisma.staff.findFirst({
          where: {
            email: session!.email,
            organizationId: orgId,
            branchId: effectiveBranchId,
            role: "teacher",
            status: "active",
          },
          select: { id: true, role: true },
        });
    if (!teacherStaff || teacherStaff.role !== "teacher") return notFound();

    const assignment = await prisma.teacherAssignment.findFirst({
      where: {
        teacherStaffId: teacherStaff.id,
        classId: exam.classId,
        organizationId: orgId,
        branchId: effectiveBranchId,
      },
      select: { id: true },
    });
    if (!assignment) return notFound();
  }

  const students = await prisma.student.findMany({
    where: {
      organizationId: orgId,
      ...(exam.classId ? { classId: exam.classId } : {}),
      ...(effectiveBranchId ? { branchId: effectiveBranchId } : {}),
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    include: { class: true },
  });

  return (
    <>
      <div className="mb-6">
        <Link href="/school/examinations" className="text-sm text-primary-600 hover:underline">← Examinations</Link>
      </div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary-600">{exam.name}</h1>
        <span className={`rounded-full px-3 py-1 text-sm font-medium ${exam.status === "published" ? "bg-school-green/20 text-green-800" : "bg-amber-100 text-amber-800"}`}>
          {exam.status}
        </span>
      </div>
      <p className="mt-1 text-slate-600">{exam.examType} · {exam.subjects.length} subjects</p>
      <div className="mt-6">
        {students.length === 0 ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            No students found for this exam class in the selected branch.
          </div>
        ) : null}
        <MarksEntryForm exam={exam} students={students} canPublish={session?.role === "school_admin" || session?.role === "admin"} />
      </div>
    </>
  );
}
