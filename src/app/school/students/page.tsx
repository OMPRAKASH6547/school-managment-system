import Link from "next/link";
import { getSession, getSelectedBranchId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";

export default async function SchoolStudentsPage() {
  const session = await getSession();
  if (session?.role === "teacher") redirect("/school/teacher");
  if (session?.role === "staff") redirect("/school/staff-attendance");
  if (session?.role === "accountant") redirect("/school");
  const orgId = session?.organizationId!;
  const branchId = await getSelectedBranchId();
  const students = await prisma.student.findMany({
    where: branchId ? { organizationId: orgId, branchId } : { organizationId: orgId },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    include: { class: true },
  });

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Students</h1>
        <Link href="/school/students/new" className="btn-primary">
          Add student
        </Link>
      </div>
      <div className="mt-6 card overflow-hidden p-0">
        {students.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            No students yet. <Link href="/school/students/new" className="text-primary-600 hover:underline">Add one</Link>.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Roll no</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Class</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {students.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {s.firstName} {s.lastName}
                    </td>
                    <td className="px-6 py-4 text-slate-600">{s.rollNo ?? "—"}</td>
                    <td className="px-6 py-4 text-slate-600">{s.class?.name ?? "—"}</td>
                    <td className="px-6 py-4 text-slate-600">{s.phone ?? s.guardianPhone ?? "—"}</td>
                    <td className="px-6 py-4">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${s.status === "active" ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-800"}`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/school/students/${s.id}`} className="text-sm text-primary-600 hover:underline">
                        Edit
                      </Link>
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
