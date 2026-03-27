import { getSession, getResolvedBranchIdForSchool } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { TransportManageForms } from "@/app/components/TransportManageForms";

/** Prisma client must be regenerated after Transport* models were added to schema. */
function transportDelegatesReady(p: typeof prisma): boolean {
  const x = p as unknown as Record<string, { findMany?: unknown } | undefined>;
  return !!(x.transportRoute?.findMany && x.transportVehicle?.findMany && x.transportStudentAssignment?.findMany);
}

export default async function TransportPage() {
  const session = await getSession();
  if (session?.role === "accountant") redirect("/school");
  const orgId = session?.organizationId!;
  const branchId = await getResolvedBranchIdForSchool(session);

  if (!transportDelegatesReady(prisma)) {
    return (
      <div className="max-w-xl rounded-xl border border-amber-200 bg-amber-50 p-6 text-slate-800">
        <h1 className="text-xl font-semibold text-amber-900">Transport needs a fresh Prisma client</h1>
        <p className="mt-2 text-sm">
          Your database schema includes Transport routes/vehicles, but the generated client is outdated. Stop the dev server,
          then run:
        </p>
        <pre className="mt-3 overflow-x-auto rounded-lg bg-white p-3 text-sm shadow-inner">
          npx prisma generate{"\n"}npx prisma db push
        </pre>
        <p className="mt-3 text-sm">Start <code className="rounded bg-white px-1">npm run dev</code> again.</p>
      </div>
    );
  }

  const [routes, vehicles, assignments, students] = await Promise.all([
    prisma.transportRoute.findMany({
      where: { organizationId: orgId, branchId },
      orderBy: { name: "asc" },
      include: { _count: { select: { vehicles: true, assignments: true } } },
    }),
    prisma.transportVehicle.findMany({
      where: { organizationId: orgId, branchId },
      orderBy: { label: "asc" },
      include: { route: { select: { id: true, name: true } } },
    }),
    prisma.transportStudentAssignment.findMany({
      where: { organizationId: orgId, branchId },
      orderBy: { createdAt: "desc" },
      include: {
        student: { select: { firstName: true, lastName: true, rollNo: true } },
        route: { select: { name: true } },
        vehicle: { select: { label: true, driverName: true } },
      },
    }),
    prisma.student.findMany({
      where: { organizationId: orgId, branchId, status: "active" },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: { id: true, firstName: true, lastName: true, rollNo: true },
    }),
  ]);

  return (
    <>
      <h1 className="text-2xl font-bold text-primary-600">Transport</h1>
      <p className="mt-1 text-slate-600">
        Routes, vans/buses, drivers, and student assignments for this branch.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-school-navy">Routes</h2>
          {routes.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">No routes yet — add one below.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {routes.map((r) => (
                <li key={r.id} className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="font-medium text-school-navy">{r.name}</span>
                  <span className="text-slate-500">
                    {r.fromPlace || "—"} → {r.toPlace || "—"} · {r._count.vehicles} vehicles · {r._count.assignments}{" "}
                    students
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-school-navy">Vehicles</h2>
          {vehicles.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">No vehicles yet.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {vehicles.map((v) => (
                <li key={v.id} className="border-b border-slate-100 pb-2">
                  <span className="font-medium text-school-navy">{v.label}</span>
                  {v.registrationNo && <span className="text-slate-600"> · {v.registrationNo}</span>}
                  <span className="text-slate-500"> · {v.capacity} seats</span>
                  {v.route && <span className="block text-xs text-slate-500">Route: {v.route.name}</span>}
                  {(v.driverName || v.driverPhone) && (
                    <span className="block text-xs text-slate-600">
                      Driver: {v.driverName ?? "—"} {v.driverPhone ? `· ${v.driverPhone}` : ""}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-8">
        <TransportManageForms
          routes={routes.map((r) => ({
            id: r.id,
            name: r.name,
            fromPlace: r.fromPlace,
            toPlace: r.toPlace,
          }))}
          vehicles={vehicles.map((v) => ({
            id: v.id,
            label: v.label,
            registrationNo: v.registrationNo,
            capacity: v.capacity,
            driverName: v.driverName,
            driverPhone: v.driverPhone,
            route: v.route,
          }))}
          assignments={assignments.map((a) => ({
            id: a.id,
            pickupPoint: a.pickupPoint,
            dropPoint: a.dropPoint,
            student: a.student,
            route: a.route,
            vehicle: a.vehicle,
          }))}
          students={students.map((s) => ({
            id: s.id,
            label: `${s.firstName} ${s.lastName}${s.rollNo ? ` (${s.rollNo})` : ""}`,
          }))}
        />
      </div>
    </>
  );
}
