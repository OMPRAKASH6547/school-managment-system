import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { MarksEntryForm } from "@/app/components/MarksEntryForm";

export default async function ExamDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  const orgId = session?.organizationId!;
  const { id } = await params;
  const exam = await prisma.exam.findFirst({
    where: { id, organizationId: orgId },
    include: {
      subjects: { orderBy: { order: "asc" } },
      results: true,
    },
  });
  if (!exam) notFound();

  const students = await prisma.student.findMany({
    where: {
      organizationId: orgId,
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
        <MarksEntryForm exam={exam} students={students} />
      </div>
    </>
  );
}
