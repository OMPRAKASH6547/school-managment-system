"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/app/components/ConfirmDialog";
import { SearchablePaginatedSelect } from "@/app/components/SearchablePaginatedSelect";

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
  const [prefillStudentId, setPrefillStudentId] = useState<string | null>(null);

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

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold text-school-navy">Assign student to route</h2>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">
          Find a student by roll number, then pick route and vehicle. Fields stay compact on wide screens.
        </p>
        <TransportRollLookup
          embedded
          onUseStudent={(id) => setPrefillStudentId(id)}
        />
        <AssignForm
          routes={routes}
          vehicles={vehicles}
          students={students}
          prefillStudentId={prefillStudentId}
          onPrefillConsumed={() => setPrefillStudentId(null)}
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

type LookupStudent = {
  id: string;
  firstName: string;
  lastName: string;
  rollNo: string | null;
  phone: string | null;
  address: string | null;
  guardianName: string | null;
  guardianPhone: string | null;
  email: string | null;
  status: string;
  class: { name: string; section: string | null } | null;
};

type LookupAssignment = {
  id: string;
  pickupPoint: string | null;
  dropPoint: string | null;
  route: { name: string; fromPlace: string | null; toPlace: string | null };
  vehicle: {
    label: string;
    registrationNo: string | null;
    driverName: string | null;
    driverPhone: string | null;
  } | null;
} | null;

function TransportRollLookup({
  onUseStudent,
  embedded = false,
}: {
  onUseStudent: (studentId: string) => void;
  /** When true, render inside Assign card (no outer box, tighter layout). */
  embedded?: boolean;
}) {
  const [roll, setRoll] = useState("");
  const [loading, setLoading] = useState(false);
  const [hint, setHint] = useState("");
  const [student, setStudent] = useState<LookupStudent | null>(null);
  const [assignment, setAssignment] = useState<LookupAssignment | null>(null);

  async function fetchDetails() {
    setHint("");
    setStudent(null);
    setAssignment(null);
    const q = roll.trim();
    if (!q) {
      setHint("Enter a roll number.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/school/transport/student-by-roll?rollNo=${encodeURIComponent(q)}`);
      const j = (await res.json()) as {
        error?: string;
        student: LookupStudent | null;
        assignment: LookupAssignment;
      };
      if (!res.ok) {
        setHint(j.error || "Lookup failed.");
        return;
      }
      if (!j.student) {
        setHint(j.error ?? "No student found with this roll number for this branch.");
        return;
      }
      setStudent(j.student);
      setAssignment(j.assignment ?? null);
      onUseStudent(j.student.id);
    } catch {
      setHint("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  const classText = student?.class
    ? [student.class.name, student.class.section].filter(Boolean).join(" ")
    : null;

  const fieldClass = "input-field h-10 py-2 text-sm";

  const lookupRow = (
    <div className={embedded ? "mt-4" : "mt-4"}>
      {!embedded && (
        <>
          <h2 className="text-lg font-semibold text-school-navy">Look up by roll number</h2>
          <p className="mt-1 text-sm text-slate-600">
            Enter a roll number to load the student&apos;s profile and any active transport assignment.
          </p>
        </>
      )}
      {embedded && (
        <h3 className="text-sm font-semibold text-slate-800">Find by roll number</h3>
      )}
      <div className={`flex flex-wrap items-end gap-2 ${embedded ? "mt-2" : "mt-4"}`}>
        <div className="w-full max-w-[11rem] sm:max-w-[12rem]">
          <label className="block text-xs font-medium text-slate-600">Roll no.</label>
          <input
            className={`${fieldClass} mt-1 w-full`}
            placeholder="e.g. 262601"
            value={roll}
            onChange={(e) => setRoll(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), fetchDetails())}
          />
        </div>
        <button
          type="button"
          onClick={fetchDetails}
          disabled={loading}
          className="h-10 shrink-0 rounded-lg bg-primary-600 px-4 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
        >
          {loading ? "…" : "Find"}
        </button>
      </div>
      {hint && <p className="mt-2 text-xs text-amber-800 sm:text-sm">{hint}</p>}
    </div>
  );

  const detailsBlock =
    student && (
        <div
          className={`rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-800 ${embedded ? "mt-3 p-3" : "mt-4 p-4"}`}
        >
          <p className="font-semibold text-school-navy">
            {student.firstName} {student.lastName}
            {student.rollNo && <span className="font-normal text-slate-600"> · Roll {student.rollNo}</span>}
          </p>
          <ul className="mt-2 space-y-1 text-slate-700">
            {classText && (
              <li>
                <span className="text-slate-500">Class:</span> {classText}
              </li>
            )}
            {student.phone && (
              <li>
                <span className="text-slate-500">Phone:</span> {student.phone}
              </li>
            )}
            {student.address && (
              <li>
                <span className="text-slate-500">Address:</span> {student.address}
              </li>
            )}
            {(student.guardianName || student.guardianPhone) && (
              <li>
                <span className="text-slate-500">Guardian:</span> {student.guardianName ?? "—"}
                {student.guardianPhone ? ` · ${student.guardianPhone}` : ""}
              </li>
            )}
            <li>
              <span className="text-slate-500">Status:</span> {student.status}
            </li>
          </ul>

          {assignment ? (
            <div className="mt-4 border-t border-slate-200 pt-3">
              <p className="font-medium text-school-navy">Current transport</p>
              <ul className="mt-1 space-y-1">
                <li>
                  <span className="text-slate-500">Route:</span> {assignment.route.name}
                  {(assignment.route.fromPlace || assignment.route.toPlace) && (
                    <span className="text-slate-600">
                      {" "}
                      ({assignment.route.fromPlace ?? "—"} → {assignment.route.toPlace ?? "—"})
                    </span>
                  )}
                </li>
                {assignment.vehicle && (
                  <li>
                    <span className="text-slate-500">Vehicle:</span> {assignment.vehicle.label}
                    {assignment.vehicle.registrationNo ? ` · ${assignment.vehicle.registrationNo}` : ""}
                    {assignment.vehicle.driverName && (
                      <span className="block text-xs text-slate-600">
                        Driver: {assignment.vehicle.driverName}
                        {assignment.vehicle.driverPhone ? ` · ${assignment.vehicle.driverPhone}` : ""}
                      </span>
                    )}
                  </li>
                )}
                {(assignment.pickupPoint || assignment.dropPoint) && (
                  <li className="text-xs text-slate-600">
                    Pickup: {assignment.pickupPoint ?? "—"} · Drop: {assignment.dropPoint ?? "—"}
                  </li>
                )}
              </ul>
            </div>
          ) : (
            <p className="mt-4 border-t border-slate-200 pt-3 text-slate-600">No active transport assignment for this student.</p>
          )}

          {embedded && (
            <p className="mt-3 text-xs font-medium text-emerald-700">Student selected in the form below.</p>
          )}
          {!embedded && (
            <button type="button" className="btn-secondary mt-4" onClick={() => onUseStudent(student.id)}>
              Use in assignment form below
            </button>
          )}
        </div>
    );

  if (embedded) {
    return (
      <>
        {lookupRow}
        {detailsBlock}
      </>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      {lookupRow}
      {detailsBlock}
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
  const routeItems = useMemo(() => routes.map((r) => ({ value: r.id, label: r.name })), [routes]);
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
      <div className="sm:col-span-2">
        <SearchablePaginatedSelect
          items={routeItems}
          value={routeId}
          onChange={setRouteId}
          emptyLabel="Optional: link to route"
        />
      </div>
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
  prefillStudentId,
  onPrefillConsumed,
}: {
  routes: RouteRow[];
  vehicles: VehicleRow[];
  students: StudentOpt[];
  onSubmit: (b: Record<string, unknown>) => void;
  prefillStudentId?: string | null;
  onPrefillConsumed?: () => void;
}) {
  const [studentId, setStudentId] = useState("");
  const [routeId, setRouteId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [pickupPoint, setPickup] = useState("");
  const [dropPoint, setDrop] = useState("");

  useEffect(() => {
    if (!prefillStudentId) return;
    setStudentId(prefillStudentId);
    onPrefillConsumed?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to id changes
  }, [prefillStudentId]);

  const compactField = "input-field h-10 min-w-0 w-full py-2 text-sm";

  const studentItems = useMemo(() => students.map((s) => ({ value: s.id, label: s.label })), [students]);
  const routeItems = useMemo(() => routes.map((r) => ({ value: r.id, label: r.name })), [routes]);
  const vehicleItems = useMemo(
    () =>
      vehicles.map((v) => ({
        value: v.id,
        label: `${v.label}${v.driverName ? ` — ${v.driverName}` : ""}`,
      })),
    [vehicles],
  );

  return (
    <div className="mt-4 max-w-5xl border-t border-slate-100 pt-4">
      <form
        className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 lg:gap-x-4 lg:gap-y-3"
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
        <div className="flex min-w-0 flex-col gap-1 md:col-span-2 lg:col-span-1">
          <label className="text-xs font-medium text-slate-600">Student</label>
          <SearchablePaginatedSelect
            items={studentItems}
            value={studentId}
            onChange={setStudentId}
            emptyLabel="Select student *"
            required
            aria-label="Student"
          />
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <label className="text-xs font-medium text-slate-600">Route</label>
          <SearchablePaginatedSelect
            items={routeItems}
            value={routeId}
            onChange={setRouteId}
            emptyLabel="Select route *"
            required
            aria-label="Route"
          />
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <label className="text-xs font-medium text-slate-600">Vehicle</label>
          <SearchablePaginatedSelect
            items={vehicleItems}
            value={vehicleId}
            onChange={setVehicleId}
            emptyLabel="Optional"
            aria-label="Vehicle"
          />
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <label className="text-xs font-medium text-slate-600">Pickup point</label>
          <input
            className={compactField}
            placeholder="Pickup"
            value={pickupPoint}
            onChange={(e) => setPickup(e.target.value)}
          />
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <label className="text-xs font-medium text-slate-600">Drop point</label>
          <input className={compactField} placeholder="Drop" value={dropPoint} onChange={(e) => setDrop(e.target.value)} />
        </div>
        <div className="flex items-end md:col-span-2 lg:col-span-1">
          <button type="submit" className="h-10 w-full rounded-lg bg-primary-600 px-4 text-sm font-medium text-white hover:bg-primary-700 lg:w-auto">
            Assign
          </button>
        </div>
      </form>
    </div>
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
