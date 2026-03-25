import Link from "next/link";
import { getSession, getSelectedBranchId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { TeacherAssignClassForm } from "@/app/components/TeacherAssignClassForm";
import { redirect } from "next/navigation";

export default async function SchoolStaffPage() {
  const session = await getSession();
  if (session?.role === "teacher") redirect("/school/teacher");
  if (session?.role === "staff") redirect("/school/staff-attendance");
  if (session?.role === "accountant") redirect("/school");
  const orgId = session?.organizationId!;
  const branchId = await getSelectedBranchId();

  const isSchoolAdmin = session?.role === "school_admin" || session?.role === "admin";

  const staff = await prisma.staff.findMany({
    where: branchId ? { organizationId: orgId, branchId } : { organizationId: orgId },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  const teacherIds = staff.filter((s) => s.role === "teacher").map((t) => t.id);

  const [classes, assignments] = await Promise.all([
    isSchoolAdmin && branchId
      ? prisma.class.findMany({
          where: { organizationId: orgId, branchId, status: "active" },
          orderBy: { name: "asc" },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
    isSchoolAdmin && branchId && teacherIds.length > 0
      ? prisma.teacherAssignment.findMany({
          where: {
            organizationId: orgId,
            branchId,
            teacherStaffId: { in: teacherIds },
          },
          select: { teacherStaffId: true, classId: true },
        })
      : Promise.resolve([]),
  ]);

  const classNameById = new Map(classes.map((c) => [c.id, c.name]));
  const assignedByTeacher = new Map<string, string[]>();
  for (const a of assignments) {
    const prev = assignedByTeacher.get(a.teacherStaffId) ?? [];
    assignedByTeacher.set(a.teacherStaffId, [...prev, a.classId]);
  }

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
                    {isSchoolAdmin && s.role === "teacher" && branchId && (
                      <div className="mt-2">
                        <div className="text-xs text-slate-500">
                          Assigned:{" "}
                          {(assignedByTeacher.get(s.id) ?? []).length === 0
                            ? "—"
                            : (assignedByTeacher.get(s.id) ?? []).map((cid) => classNameById.get(cid)).filter(Boolean).join(", ")}
                        </div>
                        <TeacherAssignClassForm
                          teacherStaffId={s.id}
                          classes={classes}
                          assignedClassIds={assignedByTeacher.get(s.id) ?? []}
                        />
                      </div>
                    )}
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
