import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { z } from "zod";

const bodySchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  orgName: z.string().min(1),
  orgType: z.enum(["school", "coaching"]),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
});

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function genCode(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = bodySchema.parse(body);

    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 400 });
    }

    const baseSlug = slugify(data.orgName);
    let slug = baseSlug;
    let n = 0;
    while (await prisma.organization.findUnique({ where: { slug } })) {
      n++;
      slug = `${baseSlug}-${n}`;
    }

    const passwordHash = await hashPassword(data.password);

    // Generate a unique `schoolCode` at registration (used by public `/result` flow).
    let schoolCode: string | null = null;
    for (let attempt = 0; attempt < 10; attempt++) {
      const candidate = genCode("SCH");
      const exists = await prisma.organization.findFirst({ where: { schoolCode: candidate } });
      if (!exists) {
        schoolCode = candidate;
        break;
      }
    }
    if (!schoolCode) schoolCode = `SCH-${Date.now()}`;

    const org = await prisma.organization.create({
      data: {
        name: data.orgName,
        slug,
        type: data.orgType,
        email: data.email,
        phone: data.phone ?? null,
        address: data.address ?? null,
        city: data.city ?? null,
        country: "India",
        status: "pending",
        schoolCode,
      },
    });

    await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        name: data.name,
        role: "school_admin",
        organizationId: org.id,
        phone: data.phone ?? null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.errors[0]?.message }, { status: 400 });
    }
    if (e instanceof Error) {
      if (e.message.includes("replica set")) {
        return NextResponse.json(
          {
            error:
              "MongoDB must be configured as a replica set for this app. (Prisma transaction requirement.)",
          },
          { status: 500 }
        );
      }
      return NextResponse.json({ error: e.message }, { status: 500 });
    }
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
