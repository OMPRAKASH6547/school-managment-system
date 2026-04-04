import { prisma } from "@/lib/db";

const FINANCE_ROLES = ["school_admin", "admin", "accountant"] as const;

/** Org profile email + active finance/admin user emails (deduped). */
export async function getSchoolNotifierEmails(organizationId: string): Promise<string[]> {
  const [org, users] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: organizationId },
      select: { email: true },
    }),
    prisma.user.findMany({
      where: {
        organizationId,
        isActive: true,
        role: { in: [...FINANCE_ROLES] },
      },
      select: { email: true },
    }),
  ]);
  const set = new Set<string>();
  if (org?.email?.trim()) set.add(org.email.trim());
  for (const u of users) {
    if (u.email?.trim()) set.add(u.email.trim());
  }
  return [...set];
}

/** Super admin emails (new school registration, platform billing). */
export async function getSuperAdminEmails(): Promise<string[]> {
  const users = await prisma.user.findMany({
    where: { role: "super_admin", isActive: true },
    select: { email: true },
  });
  return users.map((u) => u.email).filter(Boolean);
}

/** Optional comma-separated override in env. */
export function parseExtraNotifyEmails(envValue: string | undefined): string[] {
  if (!envValue?.trim()) return [];
  return envValue
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function studentFamilyPhones(s: {
  phone?: string | null;
  motherPhone?: string | null;
  guardianPhone?: string | null;
}): string[] {
  return [s.phone, s.motherPhone, s.guardianPhone].filter(
    (p): p is string => typeof p === "string" && p.replace(/\D/g, "").length >= 10
  );
}
