import { NextRequest, NextResponse } from "next/server";
import { getSession, getSelectedBranchId, resolveBranchIdForOrganization, requireOrganization } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/permissions";

/** Vacate: remove allocation and decrement room occupancy. */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    requirePermission(session, "hostel", "write");
    requireOrganization(session);
    const orgId = session.organizationId!;
    const branchId = await resolveBranchIdForOrganization(orgId, await getSelectedBranchId());
    const { id } = await params;

    const allocation = await prisma.hostelAllocation.findFirst({
      where: { id, organizationId: orgId, branchId },
      include: { room: true },
    });
    if (!allocation) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.hostelAllocation.delete({ where: { id } });
    const room = await prisma.hostelRoom.findUnique({ where: { id: allocation.roomId } });
    if (room) {
      await prisma.hostelRoom.update({
        where: { id: room.id },
        data: { currentOccupancy: Math.max(0, room.currentOccupancy - 1) },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Error && e.message.includes("Unauthorized")) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
