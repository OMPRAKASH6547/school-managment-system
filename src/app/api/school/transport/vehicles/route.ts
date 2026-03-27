import { NextRequest, NextResponse } from "next/server";
import { getSession, getSelectedBranchId, resolveBranchIdForOrganization, requireOrganization } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { requirePermission } from "@/lib/permissions";

const bodySchema = z.object({
  routeId: z.string().nullable().optional(),
  label: z.string().min(1),
  registrationNo: z.string().nullable().optional(),
  capacity: z.number().int().min(1).optional(),
  driverName: z.string().nullable().optional(),
  driverPhone: z.string().nullable().optional(),
});

export async function GET() {
  try {
    const session = await getSession();
    requirePermission(session, "transport", "read");
    requireOrganization(session);
    const orgId = session.organizationId!;
    const branchId = await resolveBranchIdForOrganization(orgId, await getSelectedBranchId());
    const vehicles = await prisma.transportVehicle.findMany({
      where: { organizationId: orgId, branchId },
      orderBy: { label: "asc" },
      include: { route: { select: { id: true, name: true } } },
    });
    return NextResponse.json({ vehicles });
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

    if (data.routeId) {
      const route = await prisma.transportRoute.findFirst({
        where: { id: data.routeId, organizationId: orgId, branchId },
      });
      if (!route) return NextResponse.json({ error: "Route not found" }, { status: 400 });
    }

    await prisma.transportVehicle.create({
      data: {
        organizationId: orgId,
        branchId,
        routeId: data.routeId ?? null,
        label: data.label,
        registrationNo: data.registrationNo ?? null,
        capacity: data.capacity ?? 40,
        driverName: data.driverName ?? null,
        driverPhone: data.driverPhone ?? null,
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
