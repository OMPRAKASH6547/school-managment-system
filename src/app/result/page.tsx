import Link from "next/link";
import { prisma } from "@/lib/db";
import { publishedExamWhereForBranch } from "@/lib/public-published-exams";
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
  student: {
    firstName: string;
    lastName: string;
    rollNo: string | null;
    id?: string;
  };
  perExam: {
    id: string;
    name: string;
    examType: string;
    totalObtained: number;
    subjects: { name: string; marksObtained: number; maxMarks?: number }[];
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
      select: { id: true, name: true },
    });

    if (!org) {
      outcome = { kind: "no_student" };
    } else {
      const branch = await prisma.branch.findFirst({
        where: {
          branchCode: { equals: branchCode, mode: "insensitive" },
          organizationId: org.id,
        },
        select: { id: true },
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
          select: { id: true, firstName: true, lastName: true, rollNo: true, dateOfBirth: true },
        });

        if (!student) {
          const want = normalizeRollForCompare(rollNumber);
          if (want) {
            const rows = await prisma.student.findMany({
              where: { organizationId: org.id, branchId: branch.id },
              select: { id: true, firstName: true, lastName: true, rollNo: true, dateOfBirth: true },
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
            select: { id: true, name: true, examType: true },
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
              maxMarks: r.subject?.maxMarks ?? undefined,
            }));

            const totalObtained = examResults.reduce((s, r) => s + r.marksObtained, 0);

            perExam.push({
              id: exam.id,
              name: exam.name,
              examType: exam.examType,
              totalObtained,
              subjects,
            });
          }

          outcome = {
            kind: "success",
            result: {
              student,
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
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Public Result</h1>
            <p className="mt-1 text-sm text-slate-600">
              Enter school code, branch code, roll number, and date of birth. Results load on submit (no separate API
              call in the browser).
            </p>
          </div>
          <Link href="/" className="text-sm font-medium text-primary-600 hover:underline">
            Home
          </Link>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
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
        </div>

        {hasQuery && (
          <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
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
            ) : !hasResults ? (
              <div className="text-sm text-slate-600">No published results found yet.</div>
            ) : (
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {result?.student.firstName} {result?.student.lastName}
                </h2>
                <p className="mt-1 text-sm text-slate-600">Roll: {result?.student.rollNo ?? "—"}</p>

                <div className="mt-6 space-y-4">
                  {result?.perExam.map((e) => (
                    <div key={e.id} className="rounded-lg border border-slate-200 p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-slate-900">{e.name}</div>
                          <div className="text-xs text-slate-500">{e.examType}</div>
                        </div>
                        <div className="text-sm font-semibold text-primary-700">Total: {e.totalObtained}</div>
                      </div>
                      <div className="mt-3 space-y-2">
                        {e.subjects.length === 0 ? (
                          <div className="text-sm text-slate-500">No marks in this exam.</div>
                        ) : (
                          <ul className="text-sm">
                            {e.subjects.map((s, idx) => (
                              <li key={`${e.id}-${idx}`} className="flex justify-between gap-3">
                                <span className="text-slate-700">{s.name}</span>
                                <span className="font-medium text-slate-900">
                                  {s.marksObtained}
                                  {typeof s.maxMarks === "number" ? ` / ${s.maxMarks}` : ""}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
