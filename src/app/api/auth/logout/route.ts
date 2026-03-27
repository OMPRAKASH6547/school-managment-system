import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth";

export async function POST() {
  const base = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const res = NextResponse.redirect(new URL("/", base), 302);
  clearSessionCookie(res);
  return res;
}
