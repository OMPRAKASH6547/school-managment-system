import { NextRequest, NextResponse } from "next/server";
import { getSession, requireOrganization } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { requirePermission } from "@/lib/permissions";

const bodySchema = z.object({
  name: z.string().min(1),
  address: z.string().optional().nullable(),
  contact: z.string().optional().nullable(),
  // Optional: allow manual branchCode. If not provided, we auto-generate.
  branchCode: z.string().optional().nullable(),
});

function genCode(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

export async function GET() {
  const session = await getSession();
  requirePermission(session, "branches", "read");
  requireOrganization(session);

  const branches = await prisma.branch.findMany({
    where: { organizationId: session.organizationId! },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, branchCode: true, address: true, contact: true },
  });

  return NextResponse.json({ branches });
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    requirePermission(session, "branches", "write");
    requireOrganization(session);

    const body = bodySchema.parse(await req.json());
    const orgId = session.organizationId!;

    let branchCode = (body.branchCode ?? undefined)?.trim() || undefined;
    if (!branchCode) {
      for (let attempt = 0; attempt < 10; attempt++) {
        const candidate = genCode("BR");
        const exists = await prisma.branch.findUnique({ where: { branchCode: candidate } });
        if (!exists) {
          branchCode = candidate;
          break;
        }
      }
    }
    if (!branchCode) {
      return NextResponse.json({ error: "Could not generate branchCode" }, { status: 500 });
    }

    // If organization doesn't have a schoolCode yet, generate one.
    // (This will be used later for public result URLs.)
    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    if (org && !org.schoolCode) {
      for (let attempt = 0; attempt < 10; attempt++) {
        const candidate = genCode("SCH");
        // app-level uniqueness check (schema currently doesn't enforce @unique)
        const exists = await prisma.organization.findFirst({ where: { schoolCode: candidate } });
        if (!exists) {
          await prisma.organization.update({ where: { id: orgId }, data: { schoolCode: candidate } });
          break;
        }
      }
    }

    await prisma.branch.create({
      data: {
        organizationId: orgId,
        name: body.name,
        address: body.address ?? null,
        contact: body.contact ?? null,
        branchCode,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.errors[0]?.message }, { status: 400 });
    }
    if (e instanceof Error && e.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

