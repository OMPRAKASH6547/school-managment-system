import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { ReportCardDownload } from "@/app/components/ReportCardDownload";
import Image from "next/image";

function formatDateLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDateUTC(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default async function PublicResultPage({
  params,
  searchParams,
}: {
  params: { slug: string; token: string };
  searchParams?: { exam?: string; roll?: string; dob?: string };
}) {
  const { slug, token } = params;
  if (token.startsWith("disabled_")) notFound();
  const examId = searchParams?.exam?.trim();
  const rollInput = searchParams?.roll?.trim() ?? "";
  const dobInput = searchParams?.dob?.trim() ?? "";

  const org = await prisma.organization.findUnique({
    where: { slug },
    select: { id: true, name: true, logo: true, address: true },
  });

  if (!org) notFound();

  const student = await prisma.student.findFirst({
    where: {
      organizationId: org.id,
      resultToken: token,
    },
    include: { class: true },
  });

  if (!student) notFound();
  const branch = student.branchId
    ? await prisma.branch.findFirst({
        where: { id: student.branchId, organizationId: org.id },
        select: { name: true, branchCode: true },
      })
    : null;

  const expectedRoll = (student.rollNo ?? "").trim().toLowerCase();
  const expectedDobLocal = student.dateOfBirth ? formatDateLocal(new Date(student.dateOfBirth)) : "";
  const expectedDobUtc = student.dateOfBirth ? formatDateUTC(new Date(student.dateOfBirth)) : "";
  const dobMatches = !!dobInput && (dobInput === expectedDobLocal || dobInput === expectedDobUtc);
  const verified =
    !!expectedRoll &&
    !!(expectedDobLocal || expectedDobUtc) &&
    rollInput.toLowerCase() === expectedRoll &&
    dobMatches;

  if (!verified) {
    return (
      <div className="min-h-screen bg-slate-100 py-8 px-4">
        <div className="mx-auto max-w-xl rounded-xl bg-white p-6 shadow">
          <div className="mb-4 flex items-center gap-3">
            {org.logo ? (
              <div className="relative h-12 w-12 overflow-hidden rounded-full border border-slate-200">
                <Image src={org.logo} alt={org.name} fill className="object-contain" />
              </div>
            ) : null}
            <div>
              <h1 className="text-xl font-bold">{org.name}</h1>
              {branch ? <p className="text-xs text-slate-500">{branch.name} ({branch.branchCode})</p> : null}
            </div>
          </div>
          <h2 className="text-base font-semibold text-slate-900">Verify student details to view result</h2>
          <p className="mt-1 text-sm text-slate-600">Enter roll number and date of birth.</p>
          <form method="get" className="mt-4 space-y-3">
            {examId ? <input type="hidden" name="exam" value={examId} /> : null}
            <div>
              <label className="block text-sm font-medium text-slate-700">Roll number</label>
              <input name="roll" defaultValue={rollInput} className="input-field mt-1" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Date of birth</label>
              <input type="date" name="dob" defaultValue={dobInput} className="input-field mt-1" required />
            </div>
            <button type="submit" className="btn-primary">Show result</button>
          </form>
          {(rollInput || dobInput) && !verified ? (
            <p className="mt-3 text-sm text-red-600">Invalid roll number or date of birth.</p>
          ) : null}
        </div>
      </div>
    );
  }

  const exams = await prisma.exam.findMany({
    where: {
      organizationId: org.id,
      branchId: student.branchId ?? undefined,
      status: "published",
      ...(examId ? { id: examId } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      subjects: { orderBy: { order: "asc" } },
      results: {
        where: { studentId: student.id },
      },
    },
  });

  const examCards = exams.map((exam) => ({
    name: exam.name,
    examType: exam.examType,
    academicYear: exam.academicYear ?? null,
    subjects: exam.subjects.map((sub) => {
      const r = exam.results.find((x) => x.subjectId === sub.id);
      return {
        name: sub.name,
        maxMarks: sub.maxMarks,
        obtained: r?.marksObtained ?? 0,
      };
    }),
  }));

  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4">
      <div className="mx-auto max-w-2xl bg-white p-6 rounded-xl shadow">
        <div className="mb-4 flex items-center gap-3">
          {org.logo ? (
            <div className="relative h-12 w-12 overflow-hidden rounded-full border border-slate-200">
              <Image src={org.logo} alt={org.name} fill className="object-contain" />
            </div>
          ) : null}
          <div>
            <h1 className="text-xl font-bold">{org.name}</h1>
            {branch ? <p className="text-xs text-slate-500">{branch.name} ({branch.branchCode})</p> : null}
          </div>
        </div>

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
            const totalMax = exam.subjects.reduce((s, sub) => s + sub.maxMarks, 0);
            const totalObtained = exam.results.reduce((s, r) => s + r.marksObtained, 0);

            const percent = totalMax > 0 ? Math.round((totalObtained / totalMax) * 100) : 0;

            return (
              <div key={exam.id} className="mt-4 border p-3 rounded">
                <h3 className="font-semibold">{exam.name}</h3>

                <p>
                  Total: {totalObtained} / {totalMax} ({percent}%)
                </p>

                <div className="mt-3">
                  <div className="text-xs font-medium text-slate-500">Subjects</div>
                  <div className="mt-2 space-y-1">
                    {exam.subjects.map((sub) => {
                      const r = exam.results.find((x) => x.subjectId === sub.id);
                      const obtained = r?.marksObtained ?? 0;
                      return (
                        <div key={sub.id} className="flex items-center justify-between gap-4 text-sm">
                          <span className="text-slate-800">{sub.name}</span>
                          <span className="font-medium text-slate-900">
                            {obtained} / {sub.maxMarks}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })
        )}

        <div className="mt-6">
          <ReportCardDownload
            slug={slug}
            token={token}
            examId={examId ?? null}
            schoolName={org.name}
            schoolLogo={org.logo ?? null}
            branchName={branch ? `${branch.name} (${branch.branchCode})` : null}
            studentName={`${student.firstName} ${student.lastName}`}
            rollNo={student.rollNo ?? null}
            className={student.class?.name ?? null}
            exams={examCards}
            studentImage={student.image ?? null}
          />
        </div>

      </div>
    </div>
  );
}

