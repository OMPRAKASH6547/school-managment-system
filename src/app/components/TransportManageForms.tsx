"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/app/components/ConfirmDialog";

type RouteRow = { id: string; name: string; fromPlace: string | null; toPlace: string | null };
type VehicleRow = {
  id: string;
  label: string;
  registrationNo: string | null;
  capacity: number;
  driverName: string | null;
  driverPhone: string | null;
  route: { id: string; name: string } | null;
};
type AssignmentRow = {
  id: string;
  pickupPoint: string | null;
  dropPoint: string | null;
  student: { firstName: string; lastName: string; rollNo: string | null };
  route: { name: string };
  vehicle: { label: string; driverName: string | null } | null;
};
type StudentOpt = { id: string; label: string };

export function TransportManageForms({
  routes,
  vehicles,
  assignments,
  students,
}: {
  routes: RouteRow[];
  vehicles: VehicleRow[];
  assignments: AssignmentRow[];
  students: StudentOpt[];
}) {
  const router = useRouter();
  const [err, setErr] = useState("");

  async function postJson(url: string, body: object) {
    setErr("");
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const d = await res.json();
    if (!res.ok) {
      setErr(d.error || "Failed");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {err && <p className="text-sm text-red-600">{err}</p>}

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-school-navy">Add route</h2>
        <p className="mt-1 text-sm text-slate-600">e.g. Route A — main city corridor.</p>
        <RouteForm onSubmit={(b) => postJson("/api/school/transport/routes", b)} />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-school-navy">Add van / bus</h2>
        <p className="mt-1 text-sm text-slate-600">Driver name and phone for parents to contact.</p>
        <VehicleForm routes={routes} onSubmit={(b) => postJson("/api/school/transport/vehicles", b)} />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-school-navy">Assign student to route</h2>
        <AssignForm
          routes={routes}
          vehicles={vehicles}
          students={students}
          onSubmit={(b) => postJson("/api/school/transport/assignments", b)}
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <h2 className="px-6 py-4 text-lg font-semibold text-school-navy">Route assignments</h2>
        {assignments.length === 0 ? (
          <div className="px-6 pb-6 text-slate-500">No assignments yet.</div>
        ) : (
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Student</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Route</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Vehicle / driver</th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase text-slate-500"> </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {assignments.map((a) => (
                <tr key={a.id}>
                  <td className="px-6 py-4 text-sm">
                    {a.student.firstName} {a.student.lastName}
                    {a.student.rollNo && <span className="text-slate-500"> ({a.student.rollNo})</span>}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-700">{a.route.name}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {a.vehicle ? (
                      <>
                        {a.vehicle.label}
                        {a.vehicle.driverName && (
                          <span className="block text-xs text-slate-500">Driver: {a.vehicle.driverName}</span>
                        )}
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <RemoveAssignmentButton id={a.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function RouteForm({ onSubmit }: { onSubmit: (b: Record<string, unknown>) => void }) {
  const [name, setName] = useState("");
  const [fromPlace, setFrom] = useState("");
  const [toPlace, setTo] = useState("");
  return (
    <form
      className="mt-4 grid gap-3 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ name, fromPlace: fromPlace || null, toPlace: toPlace || null });
        setName("");
        setFrom("");
        setTo("");
      }}
    >
      <input className="input-field" placeholder="Route name *" value={name} onChange={(e) => setName(e.target.value)} required />
      <input className="input-field" placeholder="From (area)" value={fromPlace} onChange={(e) => setFrom(e.target.value)} />
      <input className="input-field" placeholder="To (school)" value={toPlace} onChange={(e) => setTo(e.target.value)} />
      <div className="sm:col-span-2">
        <button type="submit" className="btn-primary">
          Save route
        </button>
      </div>
    </form>
  );
}

function VehicleForm({
  routes,
  onSubmit,
}: {
  routes: RouteRow[];
  onSubmit: (b: Record<string, unknown>) => void;
}) {
  const [routeId, setRouteId] = useState("");
  const [label, setLabel] = useState("");
  const [registrationNo, setReg] = useState("");
  const [capacity, setCap] = useState(40);
  const [driverName, setDriver] = useState("");
  const [driverPhone, setPhone] = useState("");
  return (
    <form
      className="mt-4 grid gap-3 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          routeId: routeId || null,
          label,
          registrationNo: registrationNo || null,
          capacity,
          driverName: driverName || null,
          driverPhone: driverPhone || null,
        });
        setLabel("");
        setReg("");
        setDriver("");
        setPhone("");
      }}
    >
      <select className="input-field sm:col-span-2" value={routeId} onChange={(e) => setRouteId(e.target.value)}>
        <option value="">Optional: link to route</option>
        {routes.map((r) => (
          <option key={r.id} value={r.id}>
            {r.name}
          </option>
        ))}
      </select>
      <input className="input-field" placeholder="Label (e.g. Van 1) *" value={label} onChange={(e) => setLabel(e.target.value)} required />
      <input className="input-field" placeholder="Registration no." value={registrationNo} onChange={(e) => setReg(e.target.value)} />
      <input
        type="number"
        min={1}
        className="input-field"
        placeholder="Seats"
        value={capacity}
        onChange={(e) => setCap(parseInt(e.target.value, 10) || 40)}
      />
      <input className="input-field" placeholder="Driver name" value={driverName} onChange={(e) => setDriver(e.target.value)} />
      <input className="input-field" placeholder="Driver phone" value={driverPhone} onChange={(e) => setPhone(e.target.value)} />
      <div className="sm:col-span-2">
        <button type="submit" className="btn-primary">
          Save vehicle
        </button>
      </div>
    </form>
  );
}

function AssignForm({
  routes,
  vehicles,
  students,
  onSubmit,
}: {
  routes: RouteRow[];
  vehicles: VehicleRow[];
  students: StudentOpt[];
  onSubmit: (b: Record<string, unknown>) => void;
}) {
  const [studentId, setStudentId] = useState("");
  const [routeId, setRouteId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [pickupPoint, setPickup] = useState("");
  const [dropPoint, setDrop] = useState("");
  return (
    <form
      className="mt-4 grid gap-3 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          studentId,
          routeId,
          vehicleId: vehicleId || null,
          pickupPoint: pickupPoint || null,
          dropPoint: dropPoint || null,
        });
        setStudentId("");
        setRouteId("");
        setVehicleId("");
        setPickup("");
        setDrop("");
      }}
    >
      <select className="input-field sm:col-span-2" value={studentId} onChange={(e) => setStudentId(e.target.value)} required>
        <option value="">Student *</option>
        {students.map((s) => (
          <option key={s.id} value={s.id}>
            {s.label}
          </option>
        ))}
      </select>
      <select className="input-field sm:col-span-2" value={routeId} onChange={(e) => setRouteId(e.target.value)} required>
        <option value="">Route *</option>
        {routes.map((r) => (
          <option key={r.id} value={r.id}>
            {r.name}
          </option>
        ))}
      </select>
      <select className="input-field sm:col-span-2" value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
        <option value="">Optional vehicle</option>
        {vehicles.map((v) => (
          <option key={v.id} value={v.id}>
            {v.label}
            {v.driverName ? ` — ${v.driverName}` : ""}
          </option>
        ))}
      </select>
      <input className="input-field" placeholder="Pickup point" value={pickupPoint} onChange={(e) => setPickup(e.target.value)} />
      <input className="input-field" placeholder="Drop point" value={dropPoint} onChange={(e) => setDrop(e.target.value)} />
      <div className="sm:col-span-2">
        <button type="submit" className="btn-primary">
          Assign
        </button>
      </div>
    </form>
  );
}

function RemoveAssignmentButton({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  async function removeConfirmed() {
    setLoading(true);
    setErr("");
    try {
      const res = await fetch(`/api/school/transport/assignments/${id}`, { method: "DELETE" });
      const d = await res.json();
      if (!res.ok) {
        setErr(d.error || "Failed");
        return;
      }
      router.refresh();
    } finally {
      setLoading(false);
      setConfirmOpen(false);
    }
  }
  return (
    <>
      {err && <span className="text-xs text-red-600">{err}</span>}
      <button type="button" onClick={() => setConfirmOpen(true)} disabled={loading} className="text-sm text-red-600 hover:underline">
        Remove
      </button>
      <ConfirmDialog
        open={confirmOpen}
        title="Remove assignment?"
        message="This will remove this transport assignment."
        confirmText="Remove"
        danger
        loading={loading}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={removeConfirmed}
      />
    </>
  );
}
