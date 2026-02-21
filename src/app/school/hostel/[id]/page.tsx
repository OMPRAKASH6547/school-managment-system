import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function HostelRoomDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  const orgId = session?.organizationId!;
  const { id } = await params;
  const room = await prisma.hostelRoom.findFirst({
    where: { id, organizationId: orgId },
    include: { allocations: true },
  });
  if (!room) notFound();

  return (
    <>
      <div className="mb-6">
        <Link href="/school/hostel" className="text-sm text-primary-600 hover:underline">← Hostel</Link>
      </div>
      <h1 className="text-2xl font-bold text-primary-600">{room.name}</h1>
      <p className="mt-1 text-slate-600">Capacity: {room.currentOccupancy} / {room.capacity} · Rent: ₹{room.rent ?? "—"}</p>
      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-school-navy">Allocations</h2>
        {room.allocations.length === 0 ? (
          <p className="mt-2 text-slate-500">No students allocated. Add allocation form here.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {room.allocations.map((a) => (
              <li key={a.id} className="text-sm">Student ID: {a.studentId} · From {new Date(a.fromDate).toLocaleDateString()}</li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
