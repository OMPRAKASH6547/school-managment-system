import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession, getResolvedBranchIdForSchool } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { BookProductEditForm } from "@/app/components/BookProductEditForm";

export default async function EditBookProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  const orgId = session?.organizationId!;
  const branchId = await getResolvedBranchIdForSchool(session);
  const product = await prisma.bookProduct.findFirst({
    where: { id, organizationId: orgId, branchId },
    select: { id: true, name: true, sku: true, price: true, stock: true, category: true, status: true },
  });
  if (!product) return notFound();

  return (
    <>
      <div className="mb-6">
        <Link href="/school/books" className="text-sm text-primary-600 hover:underline">
          ← Books & copy
        </Link>
      </div>
      <h1 className="text-2xl font-bold text-primary-600">Edit product</h1>
      <div className="mt-6 max-w-xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <BookProductEditForm product={product} />
      </div>
    </>
  );
}
