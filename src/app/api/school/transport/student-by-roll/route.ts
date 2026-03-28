import { NextRequest, NextResponse } from "next/server";
import { getSession, getSelectedBranchId, resolveBranchIdForOrganization, requireOrganization } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    requirePermission(session, "transport", "read");
    requireOrganization(session);

    const orgId = session.organizationId!;
    const branchId = await resolveBranchIdForOrganization(orgId, await getSelectedBranchId());
    const branchScope = { OR: [{ branchId }, { branchId: null }] as const };

    const rollNo = req.nextUrl.searchParams.get("rollNo")?.trim() ?? "";
    if (!rollNo) {
      return NextResponse.json({ error: "rollNo query parameter is required" }, { status: 400 });
    }

    const student = await prisma.student.findFirst({
      where: {
        organizationId: orgId,
        ...branchScope,
        rollNo: { equals: rollNo, mode: "insensitive" },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        rollNo: true,
        phone: true,
        address: true,
        guardianName: true,
        guardianPhone: true,
        email: true,
        status: true,
        class: { select: { name: true, section: true } },
      },
    });

    if (!student) {
      return NextResponse.json({ error: "No student found with this roll number in this branch.", student: null, assignment: null });
    }

    const assignment = await prisma.transportStudentAssignment.findFirst({
      where: {
        studentId: student.id,
        organizationId: orgId,
        ...branchScope,
        status: "active",
      },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        pickupPoint: true,
        dropPoint: true,
        route: { select: { name: true, fromPlace: true, toPlace: true } },
        vehicle: { select: { label: true, registrationNo: true, driverName: true, driverPhone: true } },
      },
    });

    return NextResponse.json({ student, assignment });
  } catch (e) {
    if (e instanceof Error && e.message.includes("Unauthorized")) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed to look up student" }, { status: 500 });
  }
}
