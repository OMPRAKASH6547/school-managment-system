import Link from "next/link";
import { getSession, getResolvedBranchIdForSchool } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { RecordBookSaleForm } from "@/app/components/RecordBookSaleForm";
import { DeleteRowButton } from "@/app/components/DeleteRowButton";

const PAGE_SIZE = 12;

export default async function BooksPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; page?: string }>;
}) {
  const session = await getSession();
  const orgId = session?.organizationId!;
  const branchId = await getResolvedBranchIdForSchool(session);
  const sp = (await searchParams) ?? {};
  const q = (sp.q ?? "").trim();
  const page = Math.max(1, Number(sp.page ?? "1") || 1);

  const productWhere = {
    organizationId: orgId,
    branchId,
    status: "active" as const,
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { sku: { contains: q, mode: "insensitive" as const } },
            { category: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [products, recentSales, allProductsForSale, sets, productsCount] = await Promise.all([
    prisma.bookProduct.findMany({
      where: productWhere,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.bookSale.findMany({
      where: { organizationId: orgId, branchId },
      orderBy: { soldAt: "desc" },
      take: 15,
      include: { items: { include: { product: true } } },
    }),
    prisma.bookProduct.findMany({
      where: { organizationId: orgId, branchId, status: "active" },
      select: { id: true, name: true, price: true, stock: true },
      orderBy: { name: "asc" },
    }),
    prisma.bookSet.findMany({
      where: { organizationId: orgId, branchId, isActive: true },
      orderBy: { createdAt: "desc" },
      include: { items: { include: { product: { select: { name: true, price: true } } } } },
    }),
    prisma.bookProduct.count({ where: productWhere }),
  ]);
  const pageCount = Math.max(1, Math.ceil(productsCount / PAGE_SIZE));
  const prevPage = Math.max(1, page - 1);
  const nextPage = Math.min(pageCount, page + 1);
  const qs = q ? `q=${encodeURIComponent(q)}&` : "";

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary-600">Books & copy</h1>
        <div className="flex gap-2">
          <Link href="/school/books/sets" className="rounded-lg border border-primary-200 bg-white px-4 py-2 text-sm font-medium text-primary-700 hover:bg-primary-50">
            Book sets
          </Link>
          <Link href="/school/books/products/new" className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700">
            Add product
          </Link>
        </div>
      </div>
      <p className="mt-1 text-slate-600">Sell books, copies, stationery. Generate invoice PDF with school logo.</p>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-school-navy">Products</h2>
          <form className="mt-3 flex gap-2" method="GET">
            <input
              name="q"
              defaultValue={q}
              placeholder="Filter by name, SKU, category"
              className="input-field flex-1"
            />
            <button type="submit" className="btn-secondary">
              Filter
            </button>
          </form>
          {products.length === 0 ? (
            <p className="mt-2 text-slate-500">No products. <Link href="/school/books/products/new" className="text-primary-600 hover:underline">Add one</Link>.</p>
          ) : (
            <>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase text-slate-500">Name</th>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase text-slate-500">SKU</th>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase text-slate-500">Category</th>
                      <th className="px-4 py-2 text-right text-xs font-medium uppercase text-slate-500">Price</th>
                      <th className="px-4 py-2 text-right text-xs font-medium uppercase text-slate-500">Stock</th>
                      <th className="px-4 py-2 text-right text-xs font-medium uppercase text-slate-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {products.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="px-4 py-2 text-sm text-slate-900">{p.name}</td>
                        <td className="px-4 py-2 text-sm text-slate-600">{p.sku || "—"}</td>
                        <td className="px-4 py-2 text-sm text-slate-600">{p.category || "—"}</td>
                        <td className="px-4 py-2 text-sm text-right text-slate-700">₹{p.price}</td>
                        <td className="px-4 py-2 text-sm text-right text-slate-700">{p.stock}</td>
                        <td className="px-4 py-2 text-sm text-right">
                          <Link href={`/school/books/products/${p.id}/edit`} className="text-primary-600 hover:underline">
                            Edit
                          </Link>
                          <DeleteRowButton apiPath={`/api/school/book-products/${p.id}`} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 flex items-center justify-between text-sm text-slate-600">
                <span>
                  Page {page} of {pageCount}
                </span>
                <div className="flex gap-2">
                  <Link
                    href={`/school/books?${qs}page=${prevPage}`}
                    className={`rounded border px-3 py-1 ${page <= 1 ? "pointer-events-none opacity-50" : "hover:bg-slate-50"}`}
                  >
                    Prev
                  </Link>
                  <Link
                    href={`/school/books?${qs}page=${nextPage}`}
                    className={`rounded border px-3 py-1 ${page >= pageCount ? "pointer-events-none opacity-50" : "hover:bg-slate-50"}`}
                  >
                    Next
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-school-navy">Record sale</h2>
          <RecordBookSaleForm
            products={allProductsForSale}
            sets={sets.map((s) => ({
              id: s.id,
              name: s.name,
              items: s.items.map((i) => ({
                productId: i.productId,
                quantity: i.quantity,
                productName: i.product?.name ?? null,
                unitPrice: i.product?.price ?? null,
              })),
            }))}
            organizationId={orgId}
          />
        </div>
      </div>
      <div className="mt-8 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <h2 className="px-6 py-4 text-lg font-semibold text-school-navy">Recent sales</h2>
        {recentSales.length === 0 ? (
          <div className="px-6 pb-6 text-slate-500">No sales yet.</div>
        ) : (
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Invoice</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Amount</th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase text-slate-500">PDF</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {recentSales.map((sale) => (
                <tr key={sale.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium text-school-navy">{sale.invoiceNo ?? sale.id.slice(0, 8)}</td>
                  <td className="px-6 py-4 text-slate-600">{new Date(sale.soldAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-slate-600">₹{sale.totalAmount}</td>
                  <td className="px-6 py-4 text-right">
                    <a href={`/api/pdf/book-invoice/${sale.id}`} target="_blank" rel="noopener noreferrer" className="text-school-green hover:underline text-sm">
                      Download PDF
                    </a>
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
