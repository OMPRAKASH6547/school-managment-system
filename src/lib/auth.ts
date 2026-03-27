import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { SessionUser } from "@/types";
import * as bcrypt from "bcryptjs";

export const SESSION_COOKIE = "school_saas_session";
export const BRANCH_COOKIE = "school_saas_branch";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days
const COOKIES_SECURE =
  (process.env.NEXTAUTH_URL ?? "").startsWith("https://") ||
  (process.env.NEXT_PUBLIC_BASE_URL ?? "").startsWith("https://");

/** Use with `NextResponse.cookies.set` in Route Handlers — `cookies().set` is not available in Next.js 15+. */
export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: COOKIES_SECURE,
  sameSite: "lax" as const,
  maxAge: SESSION_MAX_AGE,
  path: "/",
};

export const BRANCH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: COOKIES_SECURE,
  sameSite: "lax" as const,
  maxAge: SESSION_MAX_AGE,
  path: "/",
};

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/** Builds session token; caller must attach it with `res.cookies.set(SESSION_COOKIE, token, SESSION_COOKIE_OPTIONS)`. */
export async function createSessionToken(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      organizationId: true,
      isActive: true,
      permissionsJson: true,
    },
  });
  if (!user || !user.isActive) throw new Error("User not found or inactive");
  let permissions: SessionUser["permissions"] = null;
  if (user.permissionsJson) {
    try {
      permissions = JSON.parse(user.permissionsJson);
    } catch {
      permissions = null;
    }
  }
  const payload: SessionUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as SessionUser["role"],
    organizationId: user.organizationId,
    permissions,
  };
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

export function applySessionCookie(res: NextResponse, token: string): void {
  res.cookies.set(SESSION_COOKIE, token, SESSION_COOKIE_OPTIONS);
}

export function applyBranchCookie(res: NextResponse, branchId: string): void {
  res.cookies.set(BRANCH_COOKIE, branchId, BRANCH_COOKIE_OPTIONS);
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const payload = JSON.parse(Buffer.from(token, "base64url").toString()) as SessionUser;
    if (payload?.id && payload?.email) return payload;
  } catch {
    // ignore
  }
  return null;
}

export function clearSessionCookie(res: NextResponse): void {
  res.cookies.set(SESSION_COOKIE, "", { ...SESSION_COOKIE_OPTIONS, maxAge: 0 });
}

export function requireSuperAdmin(session: SessionUser | null): asserts session is SessionUser {
  if (!session || session.role !== "super_admin") {
    throw new Error("Unauthorized: Super Admin only");
  }
}

export function requireSchoolAdmin(session: SessionUser | null): asserts session is SessionUser {
  if (!session) throw new Error("Unauthorized");
  if (session.role !== "super_admin" && session.role !== "school_admin") {
    throw new Error("Unauthorized: School access required");
  }
}

export function requireOrganization(session: SessionUser | null): asserts session is SessionUser {
  if (!session?.organizationId) throw new Error("No organization assigned");
}

export async function getSelectedBranchId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(BRANCH_COOKIE)?.value ?? null;
}

/**
 * Resolves which branch to use for tenant APIs when the cookie may be missing
 * (common right after login). Falls back to the organization’s first branch.
 */
export async function resolveBranchIdForOrganization(
  organizationId: string,
  preferredBranchId: string | null | undefined
): Promise<string> {
  if (preferredBranchId) {
    const branch = await prisma.branch.findFirst({
      where: { id: preferredBranchId, organizationId },
      select: { id: true },
    });
    if (branch) return branch.id;
  }
  const first = await prisma.branch.findFirst({
    where: { organizationId },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (!first) throw new Error("No branch selected");
  return first.id;
}

/** Use when the client explicitly picks a branch (e.g. select-branch API). */
export async function assertBranchInOrganization(
  organizationId: string,
  branchId: string
): Promise<string> {
  const branch = await prisma.branch.findFirst({
    where: { id: branchId, organizationId },
    select: { id: true },
  });
  if (!branch) throw new Error("Invalid branch for organization");
  return branch.id;
}

/** Server pages: same resolution as school APIs (cookie optional). */
export async function getResolvedBranchIdForSchool(session: {
  organizationId: string | null | undefined;
} | null): Promise<string> {
  if (!session?.organizationId) throw new Error("No organization");
  return resolveBranchIdForOrganization(session.organizationId, await getSelectedBranchId());
}
