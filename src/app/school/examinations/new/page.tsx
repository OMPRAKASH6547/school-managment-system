import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ExamForm } from "@/app/components/ExamForm";

export default async function NewExamPage() {
  const session = await getSession();
  const orgId = session?.organizationId!;
  const classes = await prisma.class.findMany({
    where: { organizationId: orgId, status: "active" },
    orderBy: { name: "asc" },
  });

  return (
    <>
      <div className="mb-6">
        <Link href="/school/examinations" className="text-sm text-primary-600 hover:underline">← Examinations</Link>
      </div>
      <h1 className="text-2xl font-bold text-primary-600">Create exam</h1>
      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm max-w-2xl">
        <ExamForm organizationId={orgId} classes={classes} />
      </div>
    </>
  );
}
