import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { ReportCardDownload } from "@/app/components/ReportCardDownload";
import {
  PublicResultReportLayout,
  PublicResultVerifyShell,
  type ResultExamRow,
} from "@/app/components/PublicResultReportLayout";
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
        select: { name: true, branchCode: true, address: true },
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
        <PublicResultVerifyShell
          schoolName={org.name}
          schoolLogo={org.logo ?? null}
          schoolAddress={org.address ?? null}
          branchLine={branch ? `${branch.name} (${branch.branchCode})` : null}
          branchAddress={branch?.address ?? null}
          titleBar="VERIFY DETAILS TO VIEW REPORT CARD"
        >
          <h2 className="text-base font-semibold text-slate-900">Student verification</h2>
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
            <button type="submit" className="btn-primary">
              Show result
            </button>
          </form>
          {(nameInput || rollInput || dobInput) && !verified ? (
            <p className="mt-3 text-sm text-red-600">
              Details do not match. Check student name, roll number, and date of birth (including birth year).
            </p>
          ) : null}
        </PublicResultVerifyShell>
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

  const academicSessionLabel =
    examCards.map((e) => e.academicYear?.trim()).find(Boolean) ?? null;

  const studentDobDisplay = student.dateOfBirth
    ? (() => {
        const dt = new Date(student.dateOfBirth);
        const dd = String(dt.getDate()).padStart(2, "0");
        const mm = String(dt.getMonth() + 1).padStart(2, "0");
        const yyyy = dt.getFullYear();
        return `${dd}/${mm}/${yyyy}`;
      })()
    : null;

  const examRows: ResultExamRow[] = exams.map((exam) => ({
    id: exam.id,
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

  const emptyScholastic =
    exams.length === 0
      ? examId
        ? "This exam is not published, or the exam link does not match your school. Ask the school for an updated result link."
        : "No published results are available for your profile yet."
      : null;

  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4">
      <PublicResultReportLayout
        schoolName={org.name}
        schoolLogo={org.logo ?? null}
        schoolAddress={org.address ?? null}
        branchLine={branch ? `${branch.name} (${branch.branchCode})` : null}
        branchAddress={branch?.address ?? null}
        affiliationNote={null}
        academicSessionLabel={academicSessionLabel}
        studentName={`${student.firstName} ${student.lastName}`}
        studentPhoto={student.image ?? null}
        rollNo={student.rollNo ?? null}
        className={student.class?.name ?? null}
        studentDob={studentDobDisplay}
        studentAddress={student.address ?? null}
        fatherName={student.fatherName ?? student.guardianName ?? null}
        motherName={null}
        admissionNo={null}
        house={null}
        exams={examRows}
        emptyScholasticMessage={emptyScholastic}
        actions={
          <ReportCardDownload
            slug={slug}
            token={token}
            examId={examId ?? null}
            schoolName={org.name}
            schoolLogo={org.logo ?? null}
            schoolAddress={org.address ?? null}
            branchName={branch ? `${branch.name} (${branch.branchCode})` : null}
            branchAddress={branch?.address ?? null}
            affiliationNote={null}
            academicSessionLabel={academicSessionLabel}
            studentName={`${student.firstName} ${student.lastName}`}
            rollNo={student.rollNo ?? null}
            className={student.class?.name ?? null}
            studentDob={studentDobDisplay}
            studentAddress={student.address ?? null}
            fatherName={student.fatherName ?? student.guardianName ?? null}
            motherName={null}
            admissionNo={null}
            house={null}
            exams={examCards}
            studentImage={student.image ?? null}
          />
        }
      />
    </div>
  );
}

