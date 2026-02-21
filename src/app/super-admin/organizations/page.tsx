import { Suspense } from "react";
import { prisma } from "@/lib/db";
import { OrganizationsTable } from "./OrganizationsTable";

export default async function SuperAdminOrganizationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const filter = status ? { status } : {};
  const organizations = await prisma.organization.findMany({
    where: filter,
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { students: true, staff: true } },
      subscription: { include: { plan: true } },
    },
  });

  return (
    <>
      <div className="mb-4 flex gap-2">
        <a
          href="/super-admin/organizations"
          className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
            !status ? "bg-primary-100 text-primary-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          All
        </a>
        <a
          href="/super-admin/organizations?status=pending"
          className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
            status === "pending" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          Pending
        </a>
        <a
          href="/super-admin/organizations?status=approved"
          className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
            status === "approved" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          Approved
        </a>
      </div>
      <Suspense fallback={<div className="card">Loading...</div>}>
        <OrganizationsTable organizations={organizations} />
      </Suspense>
    </>
  );
}
