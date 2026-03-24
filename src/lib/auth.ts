import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import type { SessionUser } from "@/types";
import * as bcrypt from "bcryptjs";

const SESSION_COOKIE = "school_saas_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, role: true, organizationId: true, isActive: true },
  });
  if (!user || !user.isActive) throw new Error("User not found or inactive");
  const payload: SessionUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as "super_admin" | "school_admin",
    organizationId: user.organizationId,
  };
  const token = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });
  return token;
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

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
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
