import Link from "next/link";
import { prisma } from "@/lib/db";

type SearchParams = {
  schoolCode?: string;
  branchCode?: string;
  rollNumber?: string;
};

export default async function PublicResultPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const schoolCode = searchParams.schoolCode?.trim();
  const branchCode = searchParams.branchCode?.trim();
  const rollNumber = searchParams.rollNumber?.trim();

  let result:
    | null
    | {
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
      } = null;

  if (schoolCode && branchCode && rollNumber) {
    const org = await prisma.organization.findFirst({
      where: { schoolCode },
      select: { id: true, name: true },
    });

    if (!org) {
      result = { student: { firstName: "—", lastName: "", rollNo: null }, perExam: [] };
    } else {
      const branch = await prisma.branch.findFirst({
        where: { branchCode, organizationId: org.id },
        select: { id: true },
      });

      if (!branch) {
        result = { student: { firstName: "—", lastName: "", rollNo: null }, perExam: [] };
      } else {
        const student = await prisma.student.findFirst({
          where: {
            rollNo: rollNumber,
            organizationId: org.id,
            branchId: branch.id,
          },
          select: { id: true, firstName: true, lastName: true, rollNo: true },
        });

        if (!student) {
          result = { student: { firstName: "—", lastName: "", rollNo: null }, perExam: [] };
        } else {
          const publishedExams = await prisma.exam.findMany({
            where: { organizationId: org.id, branchId: branch.id, status: "published" },
            select: { id: true, name: true, examType: true },
          });

          const perExam = [];
          for (const exam of publishedExams) {
            const examResults = await prisma.examResult.findMany({
              // `exam` is already filtered by `branchId`, so we don't additionally require
              // `examResult.branchId` (it can be null for older data).
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

          result = {
            student,
            perExam,
          };
        }
      }
    }
  }

  const hasQuery = !!(schoolCode && branchCode && rollNumber);
  const hasResults = !!result && result.perExam.length > 0;

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Public Result</h1>
            <p className="mt-1 text-sm text-slate-600">Enter school code, branch code, and roll number.</p>
          </div>
          <Link href="/" className="text-sm font-medium text-primary-600 hover:underline">
            Home
          </Link>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <form method="get" className="grid gap-4">
            <div className="grid gap-2 sm:grid-cols-3">
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
              <div>
                <label className="block text-sm font-medium text-slate-700">Roll number</label>
                <input
                  name="rollNumber"
                  defaultValue={rollNumber ?? ""}
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
            {!hasResults ? (
              <div className="text-sm text-slate-600">
                {result?.student?.firstName === "—"
                  ? "No student found for this school/branch/roll number."
                  : "No published results found yet."}
              </div>
            ) : (
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {result?.student.firstName} {result?.student.lastName}
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Roll: {result?.student.rollNo ?? "—"}
                </p>

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

