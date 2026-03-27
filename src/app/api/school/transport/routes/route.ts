import { NextRequest, NextResponse } from "next/server";
import { getSession, getSelectedBranchId, resolveBranchIdForOrganization, requireOrganization } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { requirePermission } from "@/lib/permissions";

const bodySchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  fromPlace: z.string().nullable().optional(),
  toPlace: z.string().nullable().optional(),
});

export async function GET() {
  try {
    const session = await getSession();
    requirePermission(session, "transport", "read");
    requireOrganization(session);
    const orgId = session.organizationId!;
    const branchId = await resolveBranchIdForOrganization(orgId, await getSelectedBranchId());
    const routes = await prisma.transportRoute.findMany({
      where: { organizationId: orgId, branchId },
      orderBy: { name: "asc" },
      include: { _count: { select: { vehicles: true, assignments: true } } },
    });
    return NextResponse.json({ routes });
  } catch (e) {
    if (e instanceof Error && e.message.includes("Unauthorized")) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    requirePermission(session, "transport", "write");
    requireOrganization(session);
    const orgId = session.organizationId!;
    const branchId = await resolveBranchIdForOrganization(orgId, await getSelectedBranchId());
    const data = bodySchema.parse(await req.json());
    await prisma.transportRoute.create({
      data: {
        organizationId: orgId,
        branchId,
        name: data.name,
        description: data.description ?? null,
        fromPlace: data.fromPlace ?? null,
        toPlace: data.toPlace ?? null,
      },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: e.errors[0]?.message }, { status: 400 });
    if (e instanceof Error && e.message.includes("Unauthorized")) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
