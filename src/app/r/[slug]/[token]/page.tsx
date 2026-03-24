import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { ReportCardDownload } from "@/app/components/ReportCardDownload";

export default async function PublicResultPage({
  params,
}: {
  params: { slug: string; token: string };
}) {
  const { slug, token } = params;

  const org = await prisma.organization.findUnique({
    where: { slug },
    select: { id: true, name: true, logo: true, address: true },
  });

  if (!org) notFound();

  const student = await prisma.student.findFirst({
    where: {
      organizationId: org.id,
      resultToken: token,
      status: "active",
    },
    include: { class: true },
  });

  if (!student) notFound();

  const exams = await prisma.exam.findMany({
    where: {
      organizationId: org.id,
      status: "published",
    },
    orderBy: { createdAt: "desc" },
    include: {
      subjects: { orderBy: { order: "asc" } },
      results: {
        where: { studentId: student.id },
      },
    },
  }); // ✅ make sure this closes properly

  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4">
      <div className="mx-auto max-w-2xl bg-white p-6 rounded-xl shadow">

        <h1 className="text-xl font-bold mb-4">{org.name}</h1>

        <h2 className="text-lg font-semibold">
          {student.firstName} {student.lastName}
        </h2>

        <p className="text-sm text-gray-600">
          {student.rollNo && `Roll No: ${student.rollNo}`}
          {student.class && ` · ${student.class.name}`}
        </p>

        {exams.length === 0 ? (
          <p className="mt-4 text-gray-500">No results</p>
        ) : (
          exams.map((exam) => {
            const totalMax = exam.subjects.reduce(
              (s, sub) => s + sub.maxMarks,
              0
            );

            const totalObtained = exam.results.reduce(
              (s, r) => s + r.marksObtained,
              0
            );

            const percent =
              totalMax > 0
                ? Math.round((totalObtained / totalMax) * 100)
                : 0;

            return (
              <div key={exam.id} className="mt-4 border p-3 rounded">
                <h3 className="font-semibold">{exam.name}</h3>

                <p>
                  Total: {totalObtained} / {totalMax} ({percent}%)
                </p>
              </div>
            );
          })
        )}

        <div className="mt-6">
          <ReportCardDownload
            slug={slug}
            token={token}
            schoolName={org.name}
            schoolLogo={org.logo ?? null}
            studentName={`${student.firstName} ${student.lastName}`}
            rollNo={student.rollNo ?? null}
            className={student.class?.name ?? null}
            exams={[]}
            studentImage={student.image ?? null}
          />
        </div>

        <p className="mt-6 text-sm text-center">
          <Link href="/">Back</Link>
        </p>

      </div>
    </div>
  );
}