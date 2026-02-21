import Link from "next/link";
import { prisma } from "@/lib/db";

export default async function SuperAdminDashboard() {
  const [pendingCount, orgCount, planCount] = await Promise.all([
    prisma.organization.count({ where: { status: "pending" } }),
    prisma.organization.count(),
    prisma.subscriptionPlan.count({ where: { isActive: true } }),
  ]);

  return (
    <>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card">
          <p className="text-sm font-medium text-slate-500">Pending approvals</p>
          <p className="mt-2 text-3xl font-bold text-amber-600">{pendingCount}</p>
          <Link href="/super-admin/organizations?status=pending" className="mt-2 text-sm font-medium text-primary-600 hover:text-primary-700">
            View →
          </Link>
        </div>
        <div className="card">
          <p className="text-sm font-medium text-slate-500">Total organizations</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{orgCount}</p>
          <Link href="/super-admin/organizations" className="mt-2 text-sm font-medium text-primary-600 hover:text-primary-700">
            View all →
          </Link>
        </div>
        <div className="card">
          <p className="text-sm font-medium text-slate-500">Active plans</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{planCount}</p>
          <Link href="/super-admin/plans" className="mt-2 text-sm font-medium text-primary-600 hover:text-primary-700">
            Manage →
          </Link>
        </div>
        <div className="card">
          <p className="text-sm font-medium text-slate-500">Subscriptions</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {await prisma.subscription.count({ where: { status: "active" } })}
          </p>
        </div>
      </div>
      <div className="mt-8 card">
        <h2 className="text-lg font-semibold text-slate-900">Quick actions</h2>
        <ul className="mt-4 space-y-2">
          <li>
            <Link href="/super-admin/organizations?status=pending" className="text-primary-600 hover:underline">
              Review pending school/coaching applications
            </Link>
          </li>
          <li>
            <Link href="/super-admin/plans" className="text-primary-600 hover:underline">
              Edit subscription plans and pricing
            </Link>
          </li>
        </ul>
      </div>
    </>
  );
}
