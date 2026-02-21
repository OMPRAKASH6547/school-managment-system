import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { requireSchoolAdmin, requireOrganization } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const bodySchema = z.object({
  employeeId: z.string().optional(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  role: z.string().min(1),
  designation: z.string().optional(),
  joinDate: z.string().nullable().optional(),
  salary: z.number().nullable().optional(),
  status: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    requireSchoolAdmin(session);
    requireOrganization(session);
    const orgId = session.organizationId!;

    const raw = await req.json();
    const data = bodySchema.parse({
      ...raw,
      joinDate: raw.joinDate || null,
      salary: raw.salary != null ? Number(raw.salary) : null,
    });

    await prisma.staff.create({
      data: {
        organizationId: orgId,
        employeeId: data.employeeId || null,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone || null,
        role: data.role,
        designation: data.designation || null,
        joinDate: data.joinDate ? new Date(data.joinDate) : null,
        salary: data.salary ?? null,
        status: data.status || "active",
      },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.errors[0]?.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
