import Link from "next/link";
import { prisma } from "@/lib/db";
import { publishedExamWhereForBranch } from "@/lib/public-published-exams";
import { PublicResultReportLayout, PublicResultVerifyShell } from "@/app/components/PublicResultReportLayout";
import {
  dobInputMatchesStored,
  dobValueForDateInput,
  normalizeRollForCompare,
} from "@/lib/result-verification";

type SearchParams = {
  schoolCode?: string;
  branchCode?: string;
  rollNumber?: string;
  dob?: string;
};

type ResultPayload = {
  org: { name: string; logo: string | null; address: string | null };
  branch: { name: string; branchCode: string; address: string | null };
  student: {
    firstName: string;
    lastName: string;
    rollNo: string | null;
    id: string;
    address: string | null;
    guardianName: string | null;
    image: string | null;
    dateOfBirth: Date | null;
    class: { name: string } | null;
  };
  perExam: {
    id: string;
    name: string;
    examType: string;
    academicYear: string | null;
    totalObtained: number;
    subjects: { name: string; marksObtained: number; maxMarks: number }[];
  }[];
};

type Outcome =
  | { kind: "none" }
  | { kind: "no_student" }
  | { kind: "no_dob_on_file" }
  | { kind: "dob_mismatch" }
  | { kind: "success"; result: ResultPayload };

export default async function PublicResultPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const schoolCode = searchParams.schoolCode?.trim();
  const branchCode = searchParams.branchCode?.trim();
  const rollNumber = searchParams.rollNumber?.trim();
  const dob = searchParams.dob?.trim() ?? "";

  let outcome: Outcome = { kind: "none" };

  const hasQuery = !!(schoolCode && branchCode && rollNumber && dob);

  if (hasQuery && schoolCode && branchCode && rollNumber) {
    const org = await prisma.organization.findFirst({
      where: {
        schoolCode: { equals: schoolCode, mode: "insensitive" },
      },
      select: { id: true, name: true, logo: true, address: true },
    });

    if (!org) {
      outcome = { kind: "no_student" };
    } else {
      const branch = await prisma.branch.findFirst({
        where: {
          branchCode: { equals: branchCode, mode: "insensitive" },
          organizationId: org.id,
        },
        select: { id: true, name: true, branchCode: true, address: true },
      });

      if (!branch) {
        outcome = { kind: "no_student" };
      } else {
        let student = await prisma.student.findFirst({
          where: {
            organizationId: org.id,
            branchId: branch.id,
            rollNo: { equals: rollNumber, mode: "insensitive" },
          },
          include: { class: true },
        });

        if (!student) {
          const want = normalizeRollForCompare(rollNumber);
          if (want) {
            const rows = await prisma.student.findMany({
              where: { organizationId: org.id, branchId: branch.id },
              include: { class: true },
            });
            student = rows.find((r) => normalizeRollForCompare(r.rollNo ?? "") === want) ?? null;
          }
        }

        if (!student) {
          outcome = { kind: "no_student" };
        } else if (!student.dateOfBirth) {
          outcome = { kind: "no_dob_on_file" };
        } else if (!dobInputMatchesStored(dob, student.dateOfBirth)) {
          outcome = { kind: "dob_mismatch" };
        } else {
          const publishedExams = await prisma.exam.findMany({
            where: publishedExamWhereForBranch({ organizationId: org.id, branchId: branch.id }),
            select: { id: true, name: true, examType: true, academicYear: true },
          });

          const perExam = [];
          for (const exam of publishedExams) {
            const examResults = await prisma.examResult.findMany({
              where: { examId: exam.id, studentId: student.id },
              include: { subject: true },
            });

            const subjects = examResults.map((r) => ({
              name: r.subject?.name ?? "Subject",
              marksObtained: r.marksObtained,
              maxMarks: r.subject?.maxMarks ?? 0,
            }));

            const totalObtained = examResults.reduce((s, r) => s + r.marksObtained, 0);

            perExam.push({
              id: exam.id,
              name: exam.name,
              examType: exam.examType,
              academicYear: exam.academicYear ?? null,
              totalObtained,
              subjects,
            });
          }

          outcome = {
            kind: "success",
            result: {
              org: { name: org.name, logo: org.logo ?? null, address: org.address ?? null },
              branch: {
                name: branch.name,
                branchCode: branch.branchCode,
                address: branch.address ?? null,
              },
              student: {
                id: student.id,
                firstName: student.firstName,
                lastName: student.lastName,
                rollNo: student.rollNo ?? null,
                address: student.address ?? null,
                guardianName: student.guardianName ?? null,
                image: student.image ?? null,
                dateOfBirth: student.dateOfBirth ?? null,
                class: student.class ? { name: student.class.name } : null,
              },
              perExam,
            },
          };
        }
      }
    }
  }

  const result = outcome.kind === "success" ? outcome.result : null;
  const hasResults = !!result && result.perExam.length > 0;

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className={`text-2xl font-bold text-[#1e40af]`}>Public result</h1>
            <p className="mt-1 text-sm text-slate-600">
              Enter school code, branch code, roll number, and date of birth. Results load on submit (no separate API
              call in the browser).
            </p>
          </div>
          <Link href="/" className="text-sm font-medium text-[#1e40af] hover:underline">
            Home
          </Link>
        </div>

        <PublicResultVerifyShell
          schoolName="Result lookup"
          schoolLogo={null}
          schoolAddress={null}
          branchLine={null}
          branchAddress={null}
          titleBar="ENTER SCHOOL & STUDENT DETAILS"
        >
          <form method="get" className="grid gap-4">
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700">School code</label>
                <input
                  name="schoolCode"
                  defaultValue={schoolCode ?? ""}
                  className="input-field mt-1 w-full"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Branch code</label>
                <input
                  name="branchCode"
                  defaultValue={branchCode ?? ""}
                  className="input-field mt-1 w-full"
                  required
                />
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700">Roll number</label>
                <input
                  name="rollNumber"
                  defaultValue={rollNumber ?? ""}
                  className="input-field mt-1 w-full"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Date of birth</label>
                <input
                  type="date"
                  name="dob"
                  defaultValue={dobValueForDateInput(dob)}
                  className="input-field mt-1 w-full"
                  required
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button type="submit" className="btn-primary">
                Get Result
              </button>
              <Link href="/result" className="btn-secondary inline-flex items-center justify-center">
                Clear
              </Link>
            </div>
          </form>
        </PublicResultVerifyShell>

        {hasQuery && outcome.kind !== "success" ? (
          <div className={`mt-6 border-2 border-[#2563eb] bg-white p-6 shadow-sm`}>
            {outcome.kind === "no_student" ? (
              <div className="text-sm text-slate-600">
                No student found for this school code, branch code, and roll number.
              </div>
            ) : outcome.kind === "no_dob_on_file" ? (
              <div className="text-sm text-slate-600">
                Date of birth is not on file for this student. Please contact the school.
              </div>
            ) : outcome.kind === "dob_mismatch" ? (
              <div className="text-sm text-red-600">Invalid roll number or date of birth.</div>
            ) : null}
          </div>
        ) : null}

        {hasQuery && outcome.kind === "success" && result ? (
          <div className="mt-6">
            <PublicResultReportLayout
              schoolName={result.org.name}
              schoolLogo={result.org.logo}
              schoolAddress={result.org.address}
              branchLine={`${result.branch.name} (${result.branch.branchCode})`}
              branchAddress={result.branch.address}
              affiliationNote={null}
              academicSessionLabel={result.perExam.map((e) => e.academicYear?.trim()).find(Boolean) ?? null}
              studentName={`${result.student.firstName} ${result.student.lastName}`}
              studentPhoto={result.student.image}
              rollNo={result.student.rollNo}
              className={result.student.class?.name ?? null}
              studentDob={
                result.student.dateOfBirth
                  ? (() => {
                      const dt = new Date(result.student.dateOfBirth);
                      const dd = String(dt.getDate()).padStart(2, "0");
                      const mm = String(dt.getMonth() + 1).padStart(2, "0");
                      const yyyy = dt.getFullYear();
                      return `${dd}/${mm}/${yyyy}`;
                    })()
                  : null
              }
              studentAddress={result.student.address}
              fatherName={result.student.guardianName}
              motherName={null}
              admissionNo={null}
              house={null}
              exams={result.perExam.map((e) => ({
                id: e.id,
                name: e.name,
                examType: e.examType,
                academicYear: e.academicYear,
                subjects: e.subjects.map((s) => ({
                  name: s.name,
                  obtained: s.marksObtained,
                  maxMarks: s.maxMarks,
                })),
              }))}
              emptyScholasticMessage={
                !hasResults ? "No published results found yet." : null
              }
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
