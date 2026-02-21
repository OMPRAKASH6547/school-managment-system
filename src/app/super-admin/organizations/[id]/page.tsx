import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { ApproveRejectForm } from "./ApproveRejectForm";
import { AssignPlanForm } from "./AssignPlanForm";

export default async function SuperAdminOrganizationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const org = await prisma.organization.findUnique({
    where: { id },
    include: {
      subscription: { include: { plan: true } },
      _count: { select: { students: true, staff: true, classes: true } },
    },
  });
  if (!org) notFound();

  const plans = await prisma.subscriptionPlan.findMany({ where: { isActive: true } });

  return (
    <>
      <div className="mb-6">
        <Link href="/super-admin/organizations" className="text-sm text-primary-600 hover:underline">
          ← Back to organizations
        </Link>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <h2 className="text-lg font-semibold text-slate-900">{org.name}</h2>
          <p className="text-sm text-slate-500">{org.type} • {org.slug}</p>
          <dl className="mt-4 space-y-2 text-sm">
            <div><dt className="text-slate-500">Email</dt><dd className="font-medium">{org.email}</dd></div>
            {org.phone && <div><dt className="text-slate-500">Phone</dt><dd className="font-medium">{org.phone}</dd></div>}
            {org.address && <div><dt className="text-slate-500">Address</dt><dd className="font-medium">{org.address}</dd></div>}
            {org.city && <div><dt className="text-slate-500">City</dt><dd className="font-medium">{org.city}</dd></div>}
            <div>
              <dt className="text-slate-500">Status</dt>
              <dd>
                <span
                  className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    org.status === "approved" ? "bg-green-100 text-green-800" :
                    org.status === "pending" ? "bg-amber-100 text-amber-800" :
                    "bg-red-100 text-red-800"
                  }`}
                >
                  {org.status}
                </span>
              </dd>
            </div>
            <div><dt className="text-slate-500">Students / Staff / Classes</dt><dd>{org._count.students} / {org._count.staff} / {org._count.classes}</dd></div>
          </dl>
          {org.status === "pending" && (
            <div className="mt-6">
              <ApproveRejectForm organizationId={org.id} />
            </div>
          )}
        </div>
        <div className="card">
          <h2 className="text-lg font-semibold text-slate-900">Subscription</h2>
          {org.subscription ? (
            <p className="mt-2 text-slate-600">
              Plan: <strong>{org.subscription.plan.name}</strong> — {org.subscription.status}
            </p>
          ) : (
            <p className="mt-2 text-slate-500">No plan assigned.</p>
          )}
          {org.status === "approved" && (
            <div className="mt-6">
              <AssignPlanForm organizationId={org.id} plans={plans} currentPlanId={org.subscription?.planId} />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
