import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession, getResolvedBranchIdForSchool } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { BookSetForm } from "@/app/components/BookSetForm";

export default async function EditBookSetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  const orgId = session?.organizationId!;
  const branchId = await getResolvedBranchIdForSchool(session);

  const [products, classes, set] = await Promise.all([
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
    prisma.bookSet.findFirst({
      where: { id, organizationId: orgId, branchId },
      include: { items: { select: { productId: true, quantity: true } } },
    }),
  ]);

  if (!set) return notFound();

  return (
    <>
      <div className="mb-4">
        <Link href="/school/books/sets" className="text-sm text-primary-600 hover:underline">
          ← Book sets
        </Link>
      </div>
      <h1 className="text-2xl font-bold text-primary-600">Edit set</h1>
      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <BookSetForm
          products={products}
          classes={classes}
          initialSet={{
            id: set.id,
            name: set.name,
            description: set.description ?? "",
            classId: set.classId ?? "",
            isActive: set.isActive,
            items: set.items,
          }}
        />
      </div>
    </>
  );
}
