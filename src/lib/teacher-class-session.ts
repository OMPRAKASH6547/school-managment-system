import { prisma } from "@/lib/db";

/** Calendar day in the server local timezone (matches attendance date logic in start route). */
export function getLocalDayRange(reference: Date = new Date()) {
  const start = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate(), 0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

/**
 * MongoDB + Prisma: `endedAt: null` in where-clauses often does NOT match documents where `endedAt`
 * was never written. Treat "open" as endedAt missing or null in application code.
 */
const OPEN_SESSION_LOOKBACK_DAYS = 120;

export async function findOpenTeacherClassSessions(
  organizationId: string,
  branchId: string,
  teacherStaffId: string,
  options?: { classId?: string }
) {
  const since = new Date();
  since.setDate(since.getDate() - OPEN_SESSION_LOOKBACK_DAYS);
  const rows = await prisma.teacherClassSession.findMany({
    where: {
      organizationId,
      branchId,
      teacherStaffId,
      startedAt: { gte: since },
      ...(options?.classId ? { classId: options.classId } : {}),
    },
    orderBy: { startedAt: "desc" },
    take: 250,
    select: { id: true, classId: true, startedAt: true, endedAt: true },
  });
  return rows.filter((r) => r.endedAt == null);
}

/** Branch-wide live sessions (admin dashboard). Same Mongo null-safe rule as teacher open sessions. */
export async function findOpenSessionsForBranch(organizationId: string, branchId: string, take: number) {
  const since = new Date();
  since.setDate(since.getDate() - OPEN_SESSION_LOOKBACK_DAYS);
  const rows = await prisma.teacherClassSession.findMany({
    where: { organizationId, branchId, startedAt: { gte: since } },
    orderBy: { startedAt: "desc" },
    take: 200,
    select: { id: true, teacherStaffId: true, classId: true, startedAt: true, endedAt: true },
  });
  return rows.filter((r) => r.endedAt == null).slice(0, take);
}
