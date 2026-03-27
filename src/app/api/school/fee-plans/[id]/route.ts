import { NextResponse } from "next/server";
import { getSession, getSelectedBranchId, requireOrganization, resolveBranchIdForOrganization } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/permissions";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    requirePermission(session, "fees.plans", "write");
    requireOrganization(session);
    const { id } = await params;
    const orgId = session.organizationId!;
    const branchId = await resolveBranchIdForOrganization(orgId, await getSelectedBranchId());

    const plan = await prisma.feePlan.findFirst({
      where: { id, organizationId: orgId, branchId },
      select: { id: true },
    });
    if (!plan) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.$transaction(async (tx) => {
      // Keep payment history but unlink deleted plan.
      await tx.payment.updateMany({
        where: { organizationId: orgId, branchId, feePlanId: id },
        data: { feePlanId: null },
      });
      await tx.feePlan.delete({ where: { id } });
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Error && e.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

