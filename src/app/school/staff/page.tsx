import Link from "next/link";
import { getSession, getResolvedBranchIdForSchool } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { DeleteRowButton } from "@/app/components/DeleteRowButton";

export default async function SchoolStaffPage() {
  const session = await getSession();
  if (session?.role === "teacher") redirect("/school/teacher");
  if (session?.role === "staff") redirect("/school/staff-attendance");
  if (session?.role === "accountant") redirect("/school");
  const orgId = session?.organizationId!;
  const branchId = await getResolvedBranchIdForSchool(session);

  const isSchoolAdmin = session?.role === "school_admin" || session?.role === "admin";

  const staff = await prisma.staff.findMany({
    where: { organizationId: orgId, branchId },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Staff</h1>
        <Link href="/school/staff/new" className="btn-primary">
          Add staff
        </Link>
      </div>
      <div className="mt-6 card overflow-hidden p-0">
        {staff.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            No staff yet. <Link href="/school/staff/new" className="text-primary-600 hover:underline">Add one</Link>.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Phone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {staff.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {s.firstName} {s.lastName}
                    </td>
                    <td className="px-6 py-4 text-slate-600">{s.role}</td>
                    <td className="px-6 py-4 text-slate-600">{s.email}</td>
                    <td className="px-6 py-4 text-slate-600">{s.phone ?? "—"}</td>
                    <td className="px-6 py-4">
                      <span className={s.status === "active" ? "text-green-600" : "text-slate-500"}>{s.status}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/school/staff/${s.id}`} className="text-sm text-primary-600 hover:underline">
                        Edit
                      </Link>
                      <DeleteRowButton apiPath={`/api/school/staff/${s.id}`} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
