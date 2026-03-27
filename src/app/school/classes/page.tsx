import Link from "next/link";
import { getSession, getResolvedBranchIdForSchool } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { DeleteRowButton } from "@/app/components/DeleteRowButton";

export default async function SchoolClassesPage() {
  const session = await getSession();
  if (session?.role === "teacher") redirect("/school/teacher");
  if (session?.role === "staff") redirect("/school/staff-attendance");
  if (session?.role === "accountant") redirect("/school");
  const orgId = session?.organizationId!;
  const branchId = await getResolvedBranchIdForSchool(session);
  const classes = await prisma.class.findMany({
    where: { organizationId: orgId, branchId },
    orderBy: { name: "asc" },
    include: { _count: { select: { students: true } } },
  });

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Classes</h1>
        <Link href="/school/classes/new" className="btn-primary">
          Add class
        </Link>
      </div>
      <div className="mt-6 card overflow-hidden p-0">
        {classes.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            No classes yet. <Link href="/school/classes/new" className="text-primary-600 hover:underline">Add one</Link>.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Section</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Academic year</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Students</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {classes.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium text-slate-900">{c.name}</td>
                    <td className="px-6 py-4 text-slate-600">{c.section ?? "—"}</td>
                    <td className="px-6 py-4 text-slate-600">{c.academicYear ?? "—"}</td>
                    <td className="px-6 py-4 text-slate-600">{c._count.students}</td>
                    <td className="px-6 py-4">
                      <span className={c.status === "active" ? "text-green-600" : "text-slate-500"}>{c.status}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/school/classes/${c.id}`} className="text-sm text-primary-600 hover:underline">
                        Edit
                      </Link>
                      <DeleteRowButton apiPath={`/api/school/classes/${c.id}`} />
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
