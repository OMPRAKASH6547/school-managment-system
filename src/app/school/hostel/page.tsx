import Link from "next/link";
import { getSession, getResolvedBranchIdForSchool } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";

export default async function HostelPage() {
  const session = await getSession();
  if (session?.role === "teacher") redirect("/school/teacher");
  if (session?.role === "staff") redirect("/school/staff-attendance");
  if (session?.role === "accountant") redirect("/school");
  const orgId = session?.organizationId!;
  const branchId = await getResolvedBranchIdForSchool(session);
  const rooms = await prisma.hostelRoom.findMany({
    where: { organizationId: orgId, branchId },
    orderBy: { name: "asc" },
    include: { _count: { select: { allocations: true } } },
  });

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary-600">Hostel management</h1>
        <Link href="/school/hostel/new" className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700">
          Add room
        </Link>
      </div>
      <p className="mt-1 text-slate-600">Manage rooms and allocations. Available on subscription.</p>
      <div className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {rooms.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            No rooms yet. <Link href="/school/hostel/new" className="text-primary-600 hover:underline">Add one</Link>.
          </div>
        ) : (
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Room</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Capacity</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Occupancy</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Rent (₹)</th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {rooms.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium text-school-navy">{r.name}</td>
                  <td className="px-6 py-4 text-slate-600">{r.capacity}</td>
                  <td className="px-6 py-4 text-slate-600">{r.currentOccupancy}</td>
                  <td className="px-6 py-4 text-slate-600">{r.rent ?? "—"}</td>
                  <td className="px-6 py-4 text-right">
                    <Link href={`/school/hostel/${r.id}`} className="text-sm text-primary-600 hover:underline">Manage</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
