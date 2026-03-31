import { NextRequest, NextResponse } from "next/server";
import { getSession, requireOrganization } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/db";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    requirePermission(session, "branches", "write");
    requireOrganization(session);

    const { id } = await params;
    const orgId = session.organizationId!;

    const branch = await prisma.branch.findFirst({
      where: { id, organizationId: orgId },
      select: { id: true },
    });
    if (!branch) {
      return NextResponse.json({ error: "Branch not found" }, { status: 404 });
    }

    await prisma.$transaction([
      prisma.examResult.deleteMany({ where: { branchId: id } }),
      prisma.examSubject.deleteMany({ where: { branchId: id } }),
      prisma.exam.deleteMany({ where: { branchId: id } }),

      prisma.attendance.deleteMany({ where: { branchId: id } }),
      prisma.staffAttendance.deleteMany({ where: { branchId: id } }),
      prisma.payment.deleteMany({ where: { branchId: id } }),

      prisma.libraryIssue.deleteMany({ where: { branchId: id } }),
      prisma.libraryBook.deleteMany({ where: { branchId: id } }),

      prisma.hostelAllocation.deleteMany({ where: { branchId: id } }),
      prisma.hostelRoom.deleteMany({ where: { branchId: id } }),

      prisma.bookSaleItem.deleteMany({ where: { branchId: id } }),
      prisma.bookSale.deleteMany({ where: { branchId: id } }),
      prisma.bookSetItem.deleteMany({ where: { branchId: id } }),
      prisma.bookSet.deleteMany({ where: { branchId: id } }),
      prisma.bookProduct.deleteMany({ where: { branchId: id } }),

      prisma.teacherClassSession.deleteMany({ where: { branchId: id } }),
      prisma.teacherAssignment.deleteMany({ where: { branchId: id } }),

      prisma.transportStudentAssignment.deleteMany({ where: { branchId: id } }),
      prisma.transportVehicle.deleteMany({ where: { branchId: id } }),
      prisma.transportRoute.deleteMany({ where: { branchId: id } }),

      prisma.feePlan.deleteMany({ where: { branchId: id } }),
      prisma.student.deleteMany({ where: { branchId: id } }),
      prisma.staff.deleteMany({ where: { branchId: id } }),
      prisma.class.deleteMany({ where: { branchId: id } }),

      prisma.branch.delete({ where: { id } }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Error && e.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    console.error("[branches DELETE]", e);
    return NextResponse.json({ error: "Failed to delete branch" }, { status: 500 });
  }
}
