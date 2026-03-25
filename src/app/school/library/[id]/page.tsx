import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession, getSelectedBranchId } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function LibraryBookDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  const orgId = session?.organizationId!;
  const branchId = await getSelectedBranchId();
  const { id } = await params;
  const book = await prisma.libraryBook.findFirst({
    where: branchId ? { id, organizationId: orgId, branchId } : { id, organizationId: orgId },
  });
  if (!book) notFound();

  return (
    <>
      <div className="mb-6">
        <Link href="/school/library" className="text-sm text-primary-600 hover:underline">← Library</Link>
      </div>
      <h1 className="text-2xl font-bold text-primary-600">{book.title}</h1>
      <p className="mt-1 text-slate-600">{book.author ?? "—"} · Available: {book.availableCopies} / {book.totalCopies}</p>
      <p className="mt-4 text-slate-500">Issue/return form can be added here (select student, due date).</p>
    </>
  );
}
