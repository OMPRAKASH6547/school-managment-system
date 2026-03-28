import { NextResponse } from "next/server";
import { getSession, getSelectedBranchId, resolveBranchIdForOrganization, requireOrganization } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/permissions";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    requirePermission(session, "examinations", "write");
    requireOrganization(session);
    const branchId = await resolveBranchIdForOrganization(session.organizationId!, await getSelectedBranchId());
    const { id } = await params;

    const exam = await prisma.exam.findFirst({
      where: {
        id,
        organizationId: session.organizationId!,
        OR: [{ branchId }, { branchId: null }],
      },
      select: { id: true },
    });

    if (!exam) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.$transaction([
      prisma.examResult.deleteMany({ where: { examId: id } }),
      prisma.examSubject.deleteMany({ where: { examId: id } }),
      prisma.exam.deleteMany({ where: { id, organizationId: session.organizationId! } }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Error && e.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed to delete exam" }, { status: 500 });
  }
}
