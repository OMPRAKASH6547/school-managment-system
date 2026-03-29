import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { notFound, redirect } from "next/navigation";
import { DeleteExamButton } from "@/app/components/DeleteExamButton";
import { getSession, getResolvedBranchIdForSchool } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canPermission } from "@/lib/permissions";

type ExaminationListItem = Prisma.ExamGetPayload<{
  include: { _count: { select: { results: true } }; subjects: true };
}>;

export default async function ExaminationsPage() {
  const session = await getSession();
  const orgId = session?.organizationId!;
  const branchId = await getResolvedBranchIdForSchool(session);
  const staffTeacher =
    session?.role === "staff"
      ? await prisma.staff.findFirst({
          where: { email: session.email, organizationId: orgId, branchId, role: "teacher", status: "active" },
          select: { id: true },
        })
      : null;
  const isTeacherUser = session?.role === "teacher" || !!staffTeacher;
  const canDeleteExam =
    !!session && canPermission(session.role, "examinations", "write", session.permissions ?? null);

  let exams: ExaminationListItem[];
  if (session?.role === "staff" && !staffTeacher) redirect("/school/staff-attendance");
  if (session?.role === "accountant") redirect("/school");
  if (isTeacherUser) {
    if (!branchId) {
      exams = [];
    } else {
      const teacherStaff = staffTeacher
        ? staffTeacher
        : await prisma.staff.findFirst({
            where: { email: session!.email, organizationId: orgId, branchId, role: "teacher", status: "active" },
            select: { id: true },
          });
      if (!teacherStaff) return notFound();

      const assigned = await prisma.teacherAssignment.findMany({
        where: { teacherStaffId: teacherStaff.id, organizationId: orgId, branchId },
        select: { classId: true },
      });
      const classIds = assigned.map((a) => a.classId);

      if (classIds.length === 0) {
        exams = [];
      } else {
        exams = await prisma.exam.findMany({
          where: { organizationId: orgId, branchId, classId: { in: classIds } },
          orderBy: { createdAt: "desc" },
          include: { _count: { select: { results: true } }, subjects: true },
        });
      }
    }
  } else {
    exams = await prisma.exam.findMany({
      where: { organizationId: orgId, branchId },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { results: true } }, subjects: true },
    });
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary-600">Examinations</h1>
        <Link href="/school/examinations/new" className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700">
          Create exam
        </Link>
      </div>
      <div className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {exams.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            No exams yet. <Link href="/school/examinations/new" className="text-primary-600 hover:underline">Create one</Link> to manage results and generate report cards.
          </div>
        ) : (
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Exam</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Subjects</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {exams.map((exam) => (
                <tr key={exam.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium text-school-navy">{exam.name}</td>
                  <td className="px-6 py-4 text-slate-600">{exam.examType}</td>
                  <td className="px-6 py-4 text-slate-600">{exam.subjects.length} subjects</td>
                  <td className="px-6 py-4">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${exam.status === "published" ? "bg-school-green/20 text-green-800" : "bg-amber-100 text-amber-800"}`}>
                      {exam.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-sm">
                    <Link href={`/school/examinations/${exam.id}`} className="text-primary-600 hover:underline">
                      Manage / Enter marks
                    </Link>
                    {" · "}
                    <Link href={`/school/examinations/${exam.id}/results`} className="text-primary-600 hover:underline">
                      Results
                    </Link>
                    {canDeleteExam ? (
                      <>
                        {" · "}
                        <DeleteExamButton examId={exam.id} examName={exam.name} />
                      </>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
