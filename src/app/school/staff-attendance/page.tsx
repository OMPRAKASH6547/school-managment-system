import { getSession, getSelectedBranchId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { StaffAttendanceForm } from "@/app/components/StaffAttendanceForm";
import { redirect } from "next/navigation";

export default async function StaffAttendancePage() {
  const session = await getSession();
  if (session?.role === "teacher") redirect("/school/teacher");
  if (session?.role === "student") redirect("/school");
  const orgId = session?.organizationId!;
  const branchId = await getSelectedBranchId();
  const staff = await prisma.staff.findMany({
    where: branchId ? { organizationId: orgId, branchId, status: "active" } : { organizationId: orgId, status: "active" },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <h1 className="text-2xl font-bold text-primary-600">Staff attendance</h1>
      <p className="mt-1 text-slate-600">Mark daily attendance for teachers and staff.</p>
      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <StaffAttendanceForm staff={staff} defaultDate={today} />
      </div>
    </>
  );
}
