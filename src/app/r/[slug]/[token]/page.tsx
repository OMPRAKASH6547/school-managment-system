import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { ReportCardDownload } from "@/app/components/ReportCardDownload";
import Image from "next/image";
import { publishedExamWhereForStudent } from "@/lib/public-published-exams";
import {
  dobInputMatchesStored,
  dobValueForDateInput,
  formatDateLocal,
  formatDateUTC,
  normalizeRollForCompare,
  studentNameMatchesInput,
} from "@/lib/result-verification";

export default async function PublicResultPage({
  params,
  searchParams,
}: {
  params: { slug: string; token: string };
  searchParams?: { exam?: string; roll?: string; dob?: string; name?: string };
}) {
  const { slug, token } = params;
  if (token.startsWith("disabled_")) notFound();
  const examId = searchParams?.exam?.trim();
  const rollInput = searchParams?.roll?.trim() ?? "";
  const dobInput = searchParams?.dob?.trim() ?? "";
  const nameInput = searchParams?.name?.trim() ?? "";

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

  const expectedRollNorm = normalizeRollForCompare(student.rollNo ?? "");
  const expectedDobLocal = student.dateOfBirth ? formatDateLocal(new Date(student.dateOfBirth)) : "";
  const expectedDobUtc = student.dateOfBirth ? formatDateUTC(new Date(student.dateOfBirth)) : "";
  const dobMatches = dobInputMatchesStored(dobInput, student.dateOfBirth);
  const nameMatches = studentNameMatchesInput(nameInput, student.firstName, student.lastName);
  const verified =
    !!expectedRollNorm &&
    !!(expectedDobLocal || expectedDobUtc) &&
    normalizeRollForCompare(rollInput) === expectedRollNorm &&
    dobMatches &&
    nameMatches;

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
          <p className="mt-1 text-sm text-slate-600">
            Enter student name, roll number, and date of birth exactly as on school records.
          </p>
          <form method="get" className="mt-4 space-y-3">
            {examId ? <input type="hidden" name="exam" value={examId} /> : null}
            <div>
              <label className="block text-sm font-medium text-slate-700">Student name</label>
              <input
                name="name"
                autoComplete="name"
                placeholder="Full name as on admission"
                defaultValue={nameInput}
                className="input-field mt-1"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Roll number</label>
              <input name="roll" defaultValue={rollInput} className="input-field mt-1" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Date of birth</label>
              <input
                type="date"
                name="dob"
                defaultValue={dobValueForDateInput(dobInput)}
                className="input-field mt-1"
                required
              />
              <p className="mt-1 text-xs text-slate-500">
                Use the calendar picker. The year must match admission records (e.g. 2006, not 2026).
              </p>
            </div>
            <button type="submit" className="btn-primary">Show result</button>
          </form>
          {(nameInput || rollInput || dobInput) && !verified ? (
            <p className="mt-3 text-sm text-red-600">
              Details do not match. Check student name, roll number, and date of birth (including birth year).
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  const exams = await prisma.exam.findMany({
    where: publishedExamWhereForStudent({
      organizationId: org.id,
      studentBranchId: student.branchId,
      classBranchId: student.class?.branchId ?? null,
      examId: examId || undefined,
    }),
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
          <p className="mt-4 text-gray-500">
            {examId
              ? "This exam is not published, or the exam link does not match your school. Ask the school for an updated result link."
              : "No published results are available for your profile yet."}
          </p>
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

