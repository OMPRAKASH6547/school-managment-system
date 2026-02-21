"use client";

import Link from "next/link";

type Org = {
  id: string;
  name: string;
  slug: string;
  type: string;
  email: string;
  city: string | null;
  status: string;
  createdAt: Date;
  _count: { students: number; staff: number };
  subscription: { plan: { name: string } } | null;
};

export function OrganizationsTable({ organizations }: { organizations: Org[] }) {
  if (organizations.length === 0) {
    return (
      <div className="card text-center text-slate-500 py-12">
        No organizations found.
      </div>
    );
  }

  return (
    <div className="card overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Contact</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Plan</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Counts</th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {organizations.map((org) => (
              <tr key={org.id} className="hover:bg-slate-50">
                <td className="px-6 py-4">
                  <Link href={`/super-admin/organizations/${org.id}`} className="font-medium text-primary-600 hover:underline">
                    {org.name}
                  </Link>
                </td>
                <td className="px-6 py-4 text-slate-600">{org.type}</td>
                <td className="px-6 py-4 text-slate-600">{org.email}</td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      org.status === "approved"
                        ? "bg-green-100 text-green-800"
                        : org.status === "pending"
                        ? "bg-amber-100 text-amber-800"
                        : org.status === "rejected"
                        ? "bg-red-100 text-red-800"
                        : "bg-slate-100 text-slate-800"
                    }`}
                  >
                    {org.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-slate-600">{org.subscription?.plan?.name ?? "—"}</td>
                <td className="px-6 py-4 text-slate-600">
                  {org._count.students} students, {org._count.staff} staff
                </td>
                <td className="px-6 py-4 text-right">
                  <Link
                    href={`/super-admin/organizations/${org.id}`}
                    className="text-sm font-medium text-primary-600 hover:text-primary-700"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
