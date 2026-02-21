import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ClassForm } from "@/app/components/ClassForm";

export default async function EditClassPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  const orgId = session?.organizationId!;
  const { id } = await params;
  const cls = await prisma.class.findFirst({
    where: { id, organizationId: orgId },
  });
  if (!cls) notFound();

  return (
    <>
      <div className="mb-6">
        <Link href="/school/classes" className="text-sm text-primary-600 hover:underline">← Classes</Link>
      </div>
      <h1 className="text-2xl font-bold text-slate-900">Edit class</h1>
      <div className="mt-6 card max-w-xl">
        <ClassForm cls={cls} />
      </div>
    </>
  );
}
