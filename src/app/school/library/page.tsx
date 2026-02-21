import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function LibraryPage() {
  const session = await getSession();
  const orgId = session?.organizationId!;
  const books = await prisma.libraryBook.findMany({
    where: { organizationId: orgId },
    orderBy: { title: "asc" },
  });

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary-600">Library</h1>
        <Link href="/school/library/new" className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700">
          Add book
        </Link>
      </div>
      <p className="mt-1 text-slate-600">Manage books and issue/return. Available on subscription.</p>
      <div className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {books.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            No books yet. <Link href="/school/library/new" className="text-primary-600 hover:underline">Add one</Link>.
          </div>
        ) : (
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Author</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Available</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Total</th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {books.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium text-school-navy">{b.title}</td>
                  <td className="px-6 py-4 text-slate-600">{b.author ?? "—"}</td>
                  <td className="px-6 py-4 text-slate-600">{b.availableCopies}</td>
                  <td className="px-6 py-4 text-slate-600">{b.totalCopies}</td>
                  <td className="px-6 py-4 text-right">
                    <Link href={`/school/library/${b.id}`} className="text-sm text-primary-600 hover:underline">Issue / Return</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
