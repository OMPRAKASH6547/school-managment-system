import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import {
  firstZodIssueMessage,
  LIMITS,
  zEmail,
  zOptionalStr,
  zOrgName,
  zPasswordRegister,
  zPersonName,
  zPhoneOpt,
} from "@/lib/field-validation";

const bodySchema = z.object({
  name: zPersonName,
  email: zEmail,
  password: zPasswordRegister,
  orgName: zOrgName,
  orgType: z.enum(["school", "coaching"]),
  phone: zPhoneOpt,
  address: zOptionalStr(LIMITS.longText),
  city: zOptionalStr(80),
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

function defaultBranchCodeForOrg(orgId: string): string {
  return `BR-${orgId}`.toUpperCase();
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

    try {
      await prisma.branch.create({
        data: {
          organizationId: org.id,
          name: "Main Branch",
          branchCode: defaultBranchCodeForOrg(org.id),
          address: null,
          contact: null,
        },
      });
    } catch (error) {
      // If client retries the same request, ignore duplicate default-branch code.
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
        throw error;
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: firstZodIssueMessage(e) }, { status: 400 });
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
