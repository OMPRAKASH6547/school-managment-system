import Link from "next/link";
import { StaffForm } from "@/app/components/StaffForm";
import { getSession, getResolvedBranchIdForSchool } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function NewStaffPage() {
  const session = await getSession();
  const orgId = session?.organizationId!;
  const branchId = await getResolvedBranchIdForSchool(session);
  const branches = await prisma.branch.findMany({
    where: { organizationId: orgId },
    select: { id: true, name: true, branchCode: true },
    orderBy: { createdAt: "desc" },
  });
  const sorted = [...branches].sort((a, b) => (a.id === branchId ? -1 : b.id === branchId ? 1 : 0));
  const [classes, org] = await Promise.all([
    prisma.class.findMany({
      where: { organizationId: orgId, status: "active" },
      select: { id: true, name: true, branchId: true, subjects: true },
      orderBy: { name: "asc" },
    }),
    prisma.organization.findUnique({
      where: { id: orgId },
      select: { type: true },
    }),
  ]);

  return (
    <>
      <div className="mb-6">
        <Link href="/school/staff" className="text-sm text-primary-600 hover:underline">← Staff</Link>
      </div>
      <h1 className="text-2xl font-bold text-slate-900">Add staff</h1>
      <div className="mt-6 card max-w-xl">
        <StaffForm
          branches={sorted}
          classes={classes}
          initialTeacherClassSubjects={{}}
          schoolType={org?.type ?? null}
        />
      </div>
    </>
  );
}
