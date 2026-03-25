import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession, getSelectedBranchId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { MarksEntryForm } from "@/app/components/MarksEntryForm";

export default async function ExamDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  const orgId = session?.organizationId!;
  const branchId = await getSelectedBranchId();
  const { id } = await params;

  if (session?.role === "staff") redirect("/school/staff-attendance");
  if (session?.role === "accountant") redirect("/school");

  const exam = await prisma.exam.findFirst({
    where: branchId ? { id, organizationId: orgId, branchId } : { id, organizationId: orgId },
    include: {
      subjects: { orderBy: { order: "asc" } },
      results: true,
    },
  });
  if (!exam) notFound();

  // Teacher can only view/manage marks for classes they are assigned to.
  if (session?.role === "teacher") {
    if (!exam.classId || !branchId) return notFound();
    const teacherStaff = await prisma.staff.findFirst({
      where: { email: session.email, organizationId: orgId, branchId, role: "teacher" },
      select: { id: true, role: true },
    });
    if (!teacherStaff || teacherStaff.role !== "teacher") return notFound();

    const assignment = await prisma.teacherAssignment.findFirst({
      where: {
        teacherStaffId: teacherStaff.id,
        classId: exam.classId,
        organizationId: orgId,
        branchId,
      },
      select: { id: true },
    });
    if (!assignment) return notFound();
  }

  const students = await prisma.student.findMany({
    where: {
      organizationId: orgId,
      ...(branchId ? { branchId } : {}),
      status: "active",
      ...(exam.classId ? { classId: exam.classId } : {}),
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
        <MarksEntryForm exam={exam} students={students} canPublish={session?.role === "school_admin" || session?.role === "admin"} />
      </div>
    </>
  );
}
