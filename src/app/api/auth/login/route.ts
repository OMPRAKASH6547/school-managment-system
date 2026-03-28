import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { applySessionCookie, createSessionToken, verifyPassword } from "@/lib/auth";
import { z } from "zod";
import { firstZodIssueMessage, zEmail, zPasswordLogin } from "@/lib/field-validation";

const bodySchema = z.object({
  email: zEmail,
  password: zPasswordLogin,
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = bodySchema.parse(body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }
    if (!user.isActive) {
      return NextResponse.json({ error: "Account is deactivated" }, { status: 403 });
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const token = await createSessionToken(user.id);
    const redirect =
      user.role === "super_admin" ? "/super-admin" : "/school";
    const res = NextResponse.json({ ok: true, redirect });
    applySessionCookie(res, token);
    return res;
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: firstZodIssueMessage(e) }, { status: 400 });
    }
    if (e instanceof Error) {
      return NextResponse.json({ error: e.message }, { status: 500 });
    }
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
