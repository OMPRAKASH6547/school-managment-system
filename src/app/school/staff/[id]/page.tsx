import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession, getResolvedBranchIdForSchool } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { StaffForm } from "@/app/components/StaffForm";

export default async function EditStaffPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  const orgId = session?.organizationId!;
  const branchId = await getResolvedBranchIdForSchool(session);
  const { id } = await params;
  const staff = await prisma.staff.findFirst({
    where: { id, organizationId: orgId },
  });
  if (!staff) notFound();

  const branches = await prisma.branch.findMany({
    where: { organizationId: orgId },
    select: { id: true, name: true, branchCode: true },
    orderBy: { createdAt: "desc" },
  });
  const sorted = [...branches].sort((a, b) => (a.id === staff.branchId ? -1 : b.id === staff.branchId ? 1 : 0));
  const linkedUser = await prisma.user.findFirst({
    where: { organizationId: orgId, email: staff.email, isActive: true },
    select: { permissionsJson: true },
  });
  let initialModuleAccess: Record<string, { view?: boolean; add?: boolean; edit?: boolean; delete?: boolean }> | null = null;
  const [classes, assignments] = await Promise.all([
    prisma.class.findMany({
      where: { organizationId: orgId, status: "active" },
      orderBy: { name: "asc" },
      select: { id: true, name: true, branchId: true },
    }),
    prisma.teacherAssignment.findMany({
      where: {
        organizationId: orgId,
        branchId: staff.branchId ?? branchId,
        teacherStaffId: staff.id,
      },
      select: { classId: true },
    }),
  ]);

  if (linkedUser?.permissionsJson) {
    try {
      initialModuleAccess = JSON.parse(linkedUser.permissionsJson);
    } catch {
      initialModuleAccess = null;
    }
  }

  return (
    <>
      <div className="mb-6">
        <Link href="/school/staff" className="text-sm text-primary-600 hover:underline">← Staff</Link>
      </div>
      <h1 className="text-2xl font-bold text-slate-900">Edit staff</h1>
      <div className="mt-6 card max-w-xl">
        <StaffForm
          staff={staff}
          branches={sorted}
          initialModuleAccess={initialModuleAccess}
          classes={classes}
          initialTeacherClassIds={assignments.map((a) => a.classId)}
          initialTeacherClassSubjects={{}}
          initialGeneratedLoginPassword={(staff as any).generatedLoginPassword ?? null}
        />
      </div>
    </>
  );
}
