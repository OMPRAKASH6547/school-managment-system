import Link from "next/link";
import { getSession, getResolvedBranchIdForSchool } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { DeleteRowButton } from "@/app/components/DeleteRowButton";

const PAGE_SIZE = 10;

export default async function SchoolStudentsPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const session = await getSession();
  if (session?.role === "teacher") redirect("/school/teacher");
  if (session?.role === "staff") redirect("/school/staff-attendance");
  if (session?.role === "accountant") redirect("/school");
  const orgId = session?.organizationId!;
  const branchId = await getResolvedBranchIdForSchool(session);
  const q = typeof searchParams?.q === "string" ? searchParams.q.trim() : "";
  const roll = typeof searchParams?.roll === "string" ? searchParams.roll.trim() : "";
  const showNewOnly = typeof searchParams?.newOnly === "string" && searchParams.newOnly === "1";
  const page = Math.max(1, Number(typeof searchParams?.page === "string" ? searchParams.page : "1") || 1);
  const skip = (page - 1) * PAGE_SIZE;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(todayStart.getDate() + 1);

  const where: any = {
    organizationId: orgId,
    branchId,
    ...(q
      ? {
          OR: [
            { firstName: { contains: q } },
            { lastName: { contains: q } },
          ],
        }
      : {}),
    ...(roll ? { rollNo: { contains: roll } } : {}),
    ...(showNewOnly ? { createdAt: { gte: todayStart, lt: tomorrowStart } } : {}),
  };

  const [students, total] = await Promise.all([
    prisma.student.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { lastName: "asc" }, { firstName: "asc" }],
      include: { class: true },
      skip,
      take: PAGE_SIZE,
    }),
    prisma.student.count({ where }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const admissionPayments = students.length
    ? await prisma.payment.findMany({
        where: {
          organizationId: orgId,
          branchId,
          studentId: { in: students.map((s) => s.id) },
          notes: "Admission fee",
        },
        orderBy: { paidAt: "desc" },
        select: { id: true, studentId: true, verifiedAt: true, amount: true, verifiedBy: true },
      })
    : [];
  const latestAdmissionByStudent = new Map<string, (typeof admissionPayments)[number]>();
  for (const p of admissionPayments) {
    const sid = p.studentId;
    if (sid && !latestAdmissionByStudent.has(sid)) latestAdmissionByStudent.set(sid, p);
  }

  const creatorIds = students.map((s) => s.createdBy).filter((v): v is string => Boolean(v));
  const acceptedByIds = admissionPayments
    .map((p) => p.verifiedBy)
    .filter((v): v is string => Boolean(v));
  const userIds = Array.from(new Set([...creatorIds, ...acceptedByIds]));
  const users = userIds.length
    ? await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true },
      })
    : [];
  const userNameById = new Map(users.map((u) => [u.id, u.name]));

  const buildPageHref = (nextPage: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (roll) params.set("roll", roll);
    if (showNewOnly) params.set("newOnly", "1");
    params.set("page", String(nextPage));
    return `/school/students?${params.toString()}`;
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Students</h1>
        <Link href="/school/students/new" className="btn-primary">
          Add student
        </Link>
      </div>
      <form className="mt-4 grid gap-3 sm:grid-cols-4">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search by student name"
          className="input-field"
        />
        <input
          name="roll"
          defaultValue={roll}
          placeholder="Search by roll no"
          className="input-field"
        />
        <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
          <input type="checkbox" name="newOnly" value="1" defaultChecked={showNewOnly} />
          New admissions today
        </label>
        <div className="flex gap-2">
          <button type="submit" className="btn-primary">Filter</button>
          <Link href="/school/students" className="btn-secondary">Reset</Link>
        </div>
      </form>
      <div className="mt-6 card overflow-hidden p-0">
        {students.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            No students yet. <Link href="/school/students/new" className="text-primary-600 hover:underline">Add one</Link>.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-xs sm:text-sm whitespace-nowrap">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Roll no</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Class</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Added by</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Admission payment</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Payment accepted by</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {students.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {s.firstName} {s.lastName}
                      {s.createdAt >= todayStart && s.createdAt < tomorrowStart && (
                        <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">NEW</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-600">{s.rollNo ?? "—"}</td>
                    <td className="px-6 py-4 text-slate-600">{s.class?.name ?? "—"}</td>
                    <td className="px-6 py-4 text-slate-600">{s.phone ?? s.guardianPhone ?? "—"}</td>
                    <td className="px-6 py-4 text-slate-600">{s.createdBy ? userNameById.get(s.createdBy) ?? "—" : "—"}</td>
                    <td className="px-6 py-4 text-slate-600">
                      {latestAdmissionByStudent.get(s.id) ? (
                        <div className="flex items-center gap-2">
                          <span>INR {latestAdmissionByStudent.get(s.id)?.amount}</span>
                          {latestAdmissionByStudent.get(s.id)?.verifiedAt ? (
                            <a
                              className="text-xs text-primary-600 hover:underline"
                              href={`/api/pdf/admission-receipt/${latestAdmissionByStudent.get(s.id)?.id}`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Receipt
                            </a>
                          ) : (
                            <span className="text-xs text-amber-700">Pending verification</span>
                          )}
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {latestAdmissionByStudent.get(s.id)?.verifiedBy
                        ? userNameById.get(latestAdmissionByStudent.get(s.id)!.verifiedBy!) ?? "—"
                        : "—"}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${s.status === "active" ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-800"}`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/school/students/${s.id}`} className="text-sm text-primary-600 hover:underline">
                        Edit
                      </Link>
                      <DeleteRowButton apiPath={`/api/school/students/${s.id}`} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
        <span>
          Page {page} of {totalPages} ({total} records)
        </span>
        <div className="flex gap-2">
          {page > 1 && (
            <Link className="btn-secondary" href={buildPageHref(page - 1)}>
              Previous
            </Link>
          )}
          {page < totalPages && (
            <Link className="btn-secondary" href={buildPageHref(page + 1)}>
              Next
            </Link>
          )}
        </div>
      </div>
    </>
  );
}
