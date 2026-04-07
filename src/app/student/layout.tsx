import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getLoggedInStudent } from "@/lib/student-auth";
import { StudentLayout } from "@/components/StudentLayout";

export default async function StudentAreaLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) return <>{children}</>;
  if (session.role !== "student") redirect(session.role === "super_admin" ? "/super-admin" : "/school");

  const student = await getLoggedInStudent(session);
  if (!student) return <>{children}</>;

  const [org, branch] = await Promise.all([
    prisma.organization.findUnique({ where: { id: student.organizationId }, select: { name: true } }),
    student.branchId ? prisma.branch.findUnique({ where: { id: student.branchId }, select: { name: true } }) : Promise.resolve(null),
  ]);

  return (
    <StudentLayout
      schoolName={org?.name ?? "School"}
      branchName={branch?.name ?? null}
      userName={`${student.firstName} ${student.lastName}`.trim() || session.name}
    >
      {children}
    </StudentLayout>
  );
}
