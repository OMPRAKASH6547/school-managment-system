import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { ReportCardDownload } from "@/app/components/ReportCardDownload";

export default async function PublicResultPage({
  params,
}: {
  params: Promise<{ slug: string; token: string }>;
}) {
  const { slug, token } = await params();
  const org = await prisma.organization.findUnique({
    where: { slug },
    select: { id: true, name: true, logo: true, address: true },
  });
  if (!org) notFound();

  const student = await prisma.student.findFirst({
    where: { organizationId: org.id, resultToken: token, status: "active" },
    include: { class: true },
  });
  if (!student) notFound();

  const exams = await prisma.exam.findMany({
    where: { organizationId: org.id, status: "published" },
    orderBy: { createdAt: "desc" },
    include: {
      subjects: { orderBy: { order: "asc" } },
      results: {
        where: { studentId: student.id },
        include: { subject: true },
      },
    },
  });

  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4">
      <div className="mx-auto max-w-2xl rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden">
        {/* Header with school branding */}
        <div className="border-b border-slate-200 bg-primary-600 px-6 py-4 text-white">
          <div className="flex items-center gap-4">
            {org.logo ? (
              <img src={org.logo} alt="" className="h-14 w-14 rounded-full border-2 border-white object-contain bg-white" />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20 text-2xl font-bold">
                {org.name.charAt(0)}
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold">{org.name}</h1>
              <p className="text-sm text-white/90">Result / Score card</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="mb-6 flex items-center justify-between border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-lg font-bold text-school-navy">
                {student.firstName} {student.lastName}
              </h2>
              <p className="text-sm text-slate-600">
                {student.rollNo && `Roll No: ${student.rollNo}`}
                {student.class && ` · ${student.class.name}`}
              </p>
            </div>
            {student.image && (
              <img src={student.image} alt="" className="h-20 w-20 rounded-lg border object-cover" />
            )}
          </div>

          {exams.length === 0 ? (
            <p className="text-slate-500">No published results yet.</p>
          ) : (
            <div className="space-y-6">
              {exams.map((exam) => {
                const totalMax = exam.subjects.reduce((s, sub) => s + sub.maxMarks, 0);
                const totalObtained = exam.results.reduce((s, r) => s + r.marksObtained, 0);
                const percent = totalMax > 0 ? Math.round((totalObtained / totalMax) * 100) : 0;
                return (
                  <div key={exam.id} className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
                    <h3 className="font-semibold text-primary-600">{exam.name}</h3>
                    <p className="text-xs text-slate-500">{exam.examType} · {exam.academicYear || "—"}</p>
                    <table className="mt-3 w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 text-left text-slate-600">
                          <th className="py-2">Subject</th>
                          <th className="py-2 text-right">Marks</th>
                          <th className="py-2 text-right">Max</th>
                        </tr>
                      </thead>
                      <tbody>
                        {exam.subjects.map((sub) => {
                          const r = exam.results.find((x) => x.subjectId === sub.id);
                          return (
                            <tr key={sub.id} className="border-b border-slate-100">
                              <td className="py-1.5">{sub.name}</td>
                              <td className="text-right font-medium">{r?.marksObtained ?? "—"}</td>
                              <td className="text-right text-slate-500">{sub.maxMarks}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    <p className="mt-2 text-sm font-medium text-school-navy">
                      Total: {totalObtained} / {totalMax} ({percent}%)
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-8 flex flex-wrap gap-3">
            <ReportCardDownload
              slug={slug}
              token={token}
              schoolName={org.name}
              schoolLogo={org.logo}
              studentName={`${student.firstName} ${student.lastName}`}
              rollNo={student.rollNo}
              className={student.class?.name}
              exams={exams.map((exam) => ({
                name: exam.name,
                examType: exam.examType,
                academicYear: exam.academicYear,
                subjects: exam.subjects.map((sub) => {
                  const r = exam.results.find((x) => x.subjectId === sub.id);
                  return { name: sub.name, maxMarks: sub.maxMarks, obtained: r?.marksObtained ?? 0 };
                }),
              }))}
              studentImage={student.image}
            />
          </div>
        </div>
      </div>
      <p className="mt-6 text-center text-sm text-slate-500">
        <Link href="/" className="text-primary-600 hover:underline">SchoolSaaS</Link> · Keep this link private.
      </p>
    </div>
  );
}
