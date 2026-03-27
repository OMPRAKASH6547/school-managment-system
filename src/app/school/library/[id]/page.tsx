import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession, getResolvedBranchIdForSchool } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AddOrEditBookForm } from "@/app/components/AddBookForm";
import { LibraryIssueManager } from "@/app/components/LibraryIssueManager";

export default async function LibraryBookDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  const orgId = session?.organizationId!;
  const branchId = await getResolvedBranchIdForSchool(session);
  const { id } = await params;
  const book = await prisma.libraryBook.findFirst({
    where: { id, organizationId: orgId, branchId },
  });
  if (!book) notFound();

  const [students, issues] = await Promise.all([
    prisma.student.findMany({
      where: { organizationId: orgId, branchId, status: "active" },
      select: { id: true, firstName: true, lastName: true, rollNo: true },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    }),
    prisma.libraryIssue.findMany({
      // Include legacy rows that may not have org/branch populated.
      where: { bookId: book.id, status: "issued" },
      orderBy: { issuedAt: "desc" },
      select: { id: true, studentId: true, issuedAt: true, dueDate: true, status: true },
    }),
  ]);

  const studentById = new Map(
    students.map((s) => [s.id, { name: `${s.firstName} ${s.lastName}`.trim(), rollNo: s.rollNo }])
  );

  return (
    <>
      <div className="mb-6">
        <Link href="/school/library" className="text-sm text-primary-600 hover:underline">← Library</Link>
      </div>
      <h1 className="text-2xl font-bold text-primary-600">{book.title}</h1>
      <p className="mt-1 text-slate-600">{book.author ?? "—"} · Available: {book.availableCopies} / {book.totalCopies}</p>
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Edit book</h2>
          <div className="mt-4">
            <AddOrEditBookForm
              bookId={book.id}
              initial={{
                title: book.title,
                author: book.author,
                isbn: book.isbn,
                category: book.category,
                totalCopies: book.totalCopies,
              }}
            />
          </div>
        </div>
        <LibraryIssueManager
          bookId={book.id}
          availableCopies={book.availableCopies}
          students={students.map((s) => ({
            id: s.id,
            name: `${s.firstName} ${s.lastName}`.trim(),
            rollNo: s.rollNo,
          }))}
          activeIssues={issues.map((issue) => ({
            id: issue.id,
            studentName: studentById.get(issue.studentId ?? "")?.name ?? "Unknown student",
            rollNo: studentById.get(issue.studentId ?? "")?.rollNo ?? null,
            issuedAt: issue.issuedAt.toISOString(),
            dueDate: issue.dueDate ? issue.dueDate.toISOString() : null,
            status: issue.status,
          }))}
        />
      </div>
    </>
  );
}
