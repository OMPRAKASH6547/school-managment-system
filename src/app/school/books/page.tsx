import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { RecordBookSaleForm } from "@/app/components/RecordBookSaleForm";

export default async function BooksPage() {
  const session = await getSession();
  const orgId = session?.organizationId!;
  const [products, recentSales] = await Promise.all([
    prisma.bookProduct.findMany({
      where: { organizationId: orgId, status: "active" },
      orderBy: { name: "asc" },
    }),
    prisma.bookSale.findMany({
      where: { organizationId: orgId },
      orderBy: { soldAt: "desc" },
      take: 15,
      include: { items: { include: { product: true } } },
    }),
  ]);

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary-600">Books & copy</h1>
        <Link href="/school/books/products/new" className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700">
          Add product
        </Link>
      </div>
      <p className="mt-1 text-slate-600">Sell books, copies, stationery. Generate invoice PDF with school logo.</p>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-school-navy">Products</h2>
          {products.length === 0 ? (
            <p className="mt-2 text-slate-500">No products. <Link href="/school/books/products/new" className="text-primary-600 hover:underline">Add one</Link>.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {products.map((p) => (
                <li key={p.id} className="flex justify-between text-sm">
                  <span>{p.name}</span>
                  <span>₹{p.price} · Stock: {p.stock}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-school-navy">Record sale</h2>
          <RecordBookSaleForm products={products} organizationId={orgId} />
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
