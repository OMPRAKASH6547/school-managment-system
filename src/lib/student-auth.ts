import { prisma } from "@/lib/db";
import { getSelectedBranchId } from "@/lib/auth";
import type { SessionUser } from "@/types";

export async function getLoggedInStudent(session: SessionUser | null) {
  if (!session || session.role !== "student" || !session.organizationId) return null;
  const branchId = await getSelectedBranchId();
  const m = session.email.match(/^student\+(.+)@/);
  if (!m) return null;
  const studentId = m[1] ?? "";
  if (!studentId) return null;

  return prisma.student.findFirst({
    where: {
      id: studentId,
      organizationId: session.organizationId,
      ...(branchId ? { branchId } : {}),
      status: "active",
    },
    select: {
      id: true,
      organizationId: true,
      branchId: true,
      firstName: true,
      lastName: true,
      rollNo: true,
      phone: true,
      classId: true,
      image: true,
    },
  });
}
