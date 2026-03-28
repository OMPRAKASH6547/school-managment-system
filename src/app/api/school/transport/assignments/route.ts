import { NextRequest, NextResponse } from "next/server";
import { getSession, getSelectedBranchId, resolveBranchIdForOrganization, requireOrganization } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { requirePermission } from "@/lib/permissions";
import { firstZodIssueMessage, LIMITS, zCuidId, zOptionalStr } from "@/lib/field-validation";

const bodySchema = z.object({
  studentId: zCuidId,
  routeId: zCuidId,
  vehicleId: z.preprocess((v) => (v === "" || v === undefined ? null : v), z.union([z.null(), zCuidId])),
  pickupPoint: zOptionalStr(LIMITS.transportPlace),
  dropPoint: zOptionalStr(LIMITS.transportPlace),
});

export async function GET() {
  try {
    const session = await getSession();
    requirePermission(session, "transport", "read");
    requireOrganization(session);
    const orgId = session.organizationId!;
    const branchId = await resolveBranchIdForOrganization(orgId, await getSelectedBranchId());
    const assignments = await prisma.transportStudentAssignment.findMany({
      where: { organizationId: orgId, branchId },
      orderBy: { createdAt: "desc" },
      include: {
        student: { select: { id: true, firstName: true, lastName: true, rollNo: true } },
        route: { select: { id: true, name: true, fromPlace: true, toPlace: true } },
        vehicle: { select: { id: true, label: true, driverName: true, driverPhone: true } },
      },
    });
    return NextResponse.json({ assignments });
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

    const route = await prisma.transportRoute.findFirst({
      where: { id: data.routeId, organizationId: orgId, branchId },
    });
    if (!route) return NextResponse.json({ error: "Route not found" }, { status: 400 });

    const student = await prisma.student.findFirst({
      where: { id: data.studentId, organizationId: orgId, branchId },
    });
    if (!student) return NextResponse.json({ error: "Student not found" }, { status: 400 });

    if (data.vehicleId) {
      const vehicle = await prisma.transportVehicle.findFirst({
        where: { id: data.vehicleId, organizationId: orgId, branchId },
      });
      if (!vehicle) return NextResponse.json({ error: "Vehicle not found" }, { status: 400 });
    }

    await prisma.transportStudentAssignment.create({
      data: {
        organizationId: orgId,
        branchId,
        studentId: data.studentId,
        routeId: data.routeId,
        vehicleId: data.vehicleId ?? null,
        pickupPoint: data.pickupPoint ?? null,
        dropPoint: data.dropPoint ?? null,
      },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: firstZodIssueMessage(e) }, { status: 400 });
    if (e instanceof Error && e.message.includes("Unauthorized")) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
