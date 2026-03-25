import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession, getSelectedBranchId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { StudentForm } from "@/app/components/StudentForm";

export default async function EditStudentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  const orgId = session?.organizationId!;
  const branchId = await getSelectedBranchId();
  const { id } = await params;
  const student = await prisma.student.findFirst({
    where: branchId ? { id, organizationId: orgId, branchId } : { id, organizationId: orgId },
  });
  if (!student) notFound();

  const classes = await prisma.class.findMany({
    where: branchId ? { organizationId: orgId, branchId, status: "active" } : { organizationId: orgId, status: "active" },
    orderBy: { name: "asc" },
  });

  return (
    <>
      <div className="mb-6">
        <Link href="/school/students" className="text-sm text-primary-600 hover:underline">← Students</Link>
      </div>
      <h1 className="text-2xl font-bold text-slate-900">Edit student</h1>
      <div className="mt-6 card max-w-xl">
        <StudentForm organizationId={orgId} classes={classes} student={student} />
      </div>
    </>
  );
}
