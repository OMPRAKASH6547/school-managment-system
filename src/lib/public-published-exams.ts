import type { Prisma } from "@prisma/client";

/**
 * Published exams a student should see on the public token result page.
 * Matches exam.branchId to the student's branch and/or class branch, and includes legacy exams with no branch set.
 */
export function publishedExamWhereForStudent(opts: {
  organizationId: string;
  studentBranchId: string | null;
  classBranchId: string | null;
  examId?: string;
}): Prisma.ExamWhereInput {
  const { organizationId, studentBranchId, classBranchId, examId } = opts;

  // Per-exam share link (?exam=...) — student is already verified via token + roll + DOB.
  // Do not apply branch OR here: exam.branchId can differ from student/class.branchId in legacy data.
  if (examId) {
    return {
      id: examId,
      organizationId,
      status: "published",
    };
  }

  const scopeIds = Array.from(
    new Set([studentBranchId, classBranchId].filter((x): x is string => !!x))
  );

  const base: Prisma.ExamWhereInput = {
    organizationId,
    status: "published",
  };

  if (scopeIds.length === 0) {
    return base;
  }

  return {
    ...base,
    OR: [{ branchId: { in: scopeIds } }, { branchId: null }],
  };
}

/** Published exams for /result lookup by explicit branch (plus org-wide legacy exams). */
export function publishedExamWhereForBranch(opts: {
  organizationId: string;
  branchId: string;
}): Prisma.ExamWhereInput {
  return {
    organizationId: opts.organizationId,
    status: "published",
    OR: [{ branchId: opts.branchId }, { branchId: null }],
  };
}
