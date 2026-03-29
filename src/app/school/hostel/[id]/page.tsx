import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession, getResolvedBranchIdForSchool } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { HostelAllocateForm } from "@/app/components/HostelAllocateForm";
import { HostelVacateButton } from "@/app/components/HostelVacateButton";

export default async function HostelRoomDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  const orgId = session?.organizationId!;
  const branchId = await getResolvedBranchIdForSchool(session);
  const { id } = await params;
  const room = await prisma.hostelRoom.findFirst({
    where: { id, organizationId: orgId, branchId },
    include: {
      allocations: {
        where: { status: "active" },
      },
    },
  });
  if (!room) notFound();

  const allocationStudentIds = Array.from(new Set(room.allocations.map((a) => a.studentId)));
  const allocationStudents =
    allocationStudentIds.length > 0
      ? await prisma.student.findMany({
          where: {
            id: { in: allocationStudentIds },
            organizationId: orgId,
          },
          select: { id: true, firstName: true, lastName: true, rollNo: true },
        })
      : [];
  const studentById = new Map(allocationStudents.map((s) => [s.id, s]));

  const studentsForSelect = await prisma.student.findMany({
    where: { organizationId: orgId, branchId, status: "active" },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: { id: true, firstName: true, lastName: true, rollNo: true },
  });

  const allocatedIds = new Set(room.allocations.map((a) => a.studentId));
  const available = studentsForSelect.filter((s) => !allocatedIds.has(s.id));

  return (
    <>
      <div className="mb-6">
        <Link href="/school/hostel" className="text-sm text-primary-600 hover:underline">
          ← Hostel
        </Link>
      </div>
      <h1 className="text-2xl font-bold text-primary-600">{room.name}</h1>
      <p className="mt-1 text-slate-600">
        Occupancy: {room.currentOccupancy} / {room.capacity} · Rent: ₹{room.rent ?? "—"}
      </p>
      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-school-navy">Students in this room</h2>
        {room.allocations.length === 0 ? (
          <p className="mt-2 text-slate-500">No students allocated yet.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {room.allocations.map((a) => {
              const st = studentById.get(a.studentId);
              return (
              <li key={a.id} className="flex items-center justify-between text-sm border-b border-slate-100 pb-2">
                <span>
                  {st ? (
                    <>
                      <span className="font-medium text-school-navy">
                        {st.firstName} {st.lastName}
                      </span>
                      {st.rollNo && (
                        <span className="text-slate-500"> · Roll {st.rollNo}</span>
                      )}
                    </>
                  ) : (
                    <span className="text-slate-600">Student {a.studentId}</span>
                  )}
                  <span className="text-slate-500"> · from {new Date(a.fromDate).toLocaleDateString()}</span>
                </span>
                <HostelVacateButton allocationId={a.id} />
              </li>
            );
            })}
          </ul>
        )}

        {room.currentOccupancy < room.capacity && (
          <HostelAllocateForm
            roomId={room.id}
            students={available.map((s) => ({
              id: s.id,
              label: `${s.firstName} ${s.lastName}${s.rollNo ? ` (${s.rollNo})` : ""}`,
            }))}
          />
        )}
      </div>
    </>
  );
}
