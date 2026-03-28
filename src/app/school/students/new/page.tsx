import Link from "next/link";
import { getSession, getResolvedBranchIdForSchool } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { StudentForm } from "@/app/components/StudentForm";

export default async function NewStudentPage() {
  const session = await getSession();
  const orgId = session?.organizationId!;
  const branchId = await getResolvedBranchIdForSchool(session);
  const classes = await prisma.class.findMany({
    where: { organizationId: orgId, branchId, status: "active" },
    orderBy: { name: "asc" },
  });

  return (
    <>
      <div className="mb-6">
        <Link href="/school/students" className="text-sm text-primary-600 hover:underline">← Students</Link>
      </div>
      <h1 className="text-2xl font-bold text-slate-900">Add student</h1>
      <div className="mt-6 card max-w-3xl">
        <StudentForm organizationId={orgId} classes={classes} />
      </div>
    </>
  );
}
