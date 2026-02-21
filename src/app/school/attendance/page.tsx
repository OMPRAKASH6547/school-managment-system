import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AttendanceForm } from "@/app/components/AttendanceForm";

export default async function SchoolAttendancePage() {
  const session = await getSession();
  const orgId = session?.organizationId!;
  const [students, classes] = await Promise.all([
    prisma.student.findMany({
      where: { organizationId: orgId, status: "active" },
      orderBy: [{ classId: "asc" }, { lastName: "asc" }, { firstName: "asc" }],
      include: { class: true },
    }),
    prisma.class.findMany({
      where: { organizationId: orgId, status: "active" },
      orderBy: { name: "asc" },
    }),
  ]);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <h1 className="text-2xl font-bold text-slate-900">Attendance</h1>
      <div className="mt-6 card">
        <AttendanceForm students={students} classes={classes} defaultDate={today} />
      </div>
    </>
  );
}
