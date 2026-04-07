import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { applyBranchCookie, applySessionCookie, createSessionToken, hashPassword } from "@/lib/auth";
import { firstZodIssueMessage } from "@/lib/field-validation";

const bodySchema = z.object({
  organizationId: z.string().min(1),
  branchId: z.string().min(1),
  rollNo: z.string().min(1),
  phone: z.string().min(6),
});

function normPhone(s: string): string {
  return s.replace(/\D/g, "");
}

export async function POST(req: NextRequest) {
  try {
    const body = bodySchema.parse(await req.json());
    const rollNo = body.rollNo.trim();
    const phone = normPhone(body.phone);
    if (!phone) return NextResponse.json({ error: "Phone number is required" }, { status: 400 });

    const school = await prisma.organization.findFirst({
      where: { id: body.organizationId, status: "approved" },
      select: { id: true, slug: true },
    });
    if (!school) return NextResponse.json({ error: "School not found or not approved" }, { status: 404 });

    const branch = await prisma.branch.findFirst({
      where: { id: body.branchId, organizationId: school.id },
      select: { id: true },
    });
    if (!branch) return NextResponse.json({ error: "Invalid branch selected" }, { status: 400 });

    const student = await prisma.student.findFirst({
      where: {
        organizationId: school.id,
        branchId: branch.id,
        rollNo,
        status: "active",
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        motherPhone: true,
        guardianPhone: true,
      },
    });
    if (!student) {
      return NextResponse.json({ error: "Student not found. Contact school admin." }, { status: 404 });
    }

    const allowed = [student.phone, student.motherPhone, student.guardianPhone]
      .map((p) => normPhone(p ?? ""))
      .filter(Boolean);
    if (!allowed.includes(phone)) {
      return NextResponse.json({ error: "Phone verification failed" }, { status: 401 });
    }

    // Ensure every student login uses an existing DB student (no self-registration).
    const syntheticEmail = `student+${student.id}@${school.slug}.local`;
    let user = await prisma.user.findUnique({ where: { email: syntheticEmail }, select: { id: true } });
    if (!user) {
      const passwordHash = await hashPassword(`student:${student.id}:${Date.now()}`);
      user = await prisma.user.create({
        data: {
          email: syntheticEmail,
          passwordHash,
          name: `${student.firstName} ${student.lastName}`.trim() || "Student",
          role: "student",
          organizationId: school.id,
          phone: student.phone ?? null,
          isActive: true,
        },
        select: { id: true },
      });
    }

    const token = await createSessionToken(user.id);
    const res = NextResponse.json({ ok: true, redirect: "/student" });
    applySessionCookie(res, token);
    applyBranchCookie(res, branch.id);
    return res;
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: firstZodIssueMessage(e) }, { status: 400 });
    }
    return NextResponse.json({ error: "Student login failed" }, { status: 500 });
  }
}
