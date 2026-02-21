import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { StaffForm } from "@/app/components/StaffForm";

export default async function EditStaffPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  const orgId = session?.organizationId!;
  const { id } = await params;
  const staff = await prisma.staff.findFirst({
    where: { id, organizationId: orgId },
  });
  if (!staff) notFound();

  return (
    <>
      <div className="mb-6">
        <Link href="/school/staff" className="text-sm text-primary-600 hover:underline">← Staff</Link>
      </div>
      <h1 className="text-2xl font-bold text-slate-900">Edit staff</h1>
      <div className="mt-6 card max-w-xl">
        <StaffForm staff={staff} />
      </div>
    </>
  );
}
