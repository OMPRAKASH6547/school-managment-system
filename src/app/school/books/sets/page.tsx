import Link from "next/link";
import { getSession, getResolvedBranchIdForSchool } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { BookSetForm } from "@/app/components/BookSetForm";
import { DeleteRowButton } from "@/app/components/DeleteRowButton";

export default async function BookSetsPage() {
  const session = await getSession();
  const orgId = session?.organizationId!;
  const branchId = await getResolvedBranchIdForSchool(session);

  const [products, classes, sets] = await Promise.all([
    prisma.bookProduct.findMany({
      where: { organizationId: orgId, branchId, status: "active" },
      select: { id: true, name: true, price: true },
      orderBy: { name: "asc" },
    }),
    prisma.class.findMany({
      where: { organizationId: orgId, branchId, status: "active" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.bookSet.findMany({
      where: { organizationId: orgId, branchId, isActive: true },
      orderBy: { createdAt: "desc" },
      include: { items: { include: { product: true } } },
    }),
  ]);

  return (
    <>
      <div className="mb-4">
        <Link href="/school/books" className="text-sm text-primary-600 hover:underline">
          ← Books & copy
        </Link>
      </div>
      <h1 className="text-2xl font-bold text-primary-600">Book sets</h1>
      <p className="mt-1 text-slate-600">Create reusable sets and use them directly in sales/invoice.</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-school-navy">Create set</h2>
          <div className="mt-4">
            <BookSetForm products={products} classes={classes} />
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-school-navy">Existing sets</h2>
          {sets.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">No sets yet.</p>
          ) : (
            <div className="mt-3 space-y-4">
              {sets.map((set) => (
                <div key={set.id} className="rounded-lg border border-slate-200 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium text-slate-900">{set.name}</p>
                    <div className="flex items-center gap-3">
                      <Link href={`/school/books/sets/${set.id}/edit`} className="text-sm text-primary-600 hover:underline">
                        Edit
                      </Link>
                      <DeleteRowButton apiPath={`/api/school/book-sets/${set.id}`} label="Delete" />
                    </div>
                  </div>
                  <p className="text-xs text-slate-500">{set.description ?? "—"}</p>
                  {(() => {
                    const visibleItems = set.items.filter((it) => it.product && it.product.category !== "set_item");
                    if (visibleItems.length === 0) return null;
                    return (
                      <ul className="mt-2 text-sm text-slate-700">
                        {visibleItems.map((it) => (
                          <li key={it.id}>
                            {it.product?.name ?? "Unknown"} x {it.quantity}
                          </li>
                        ))}
                      </ul>
                    );
                  })()}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
