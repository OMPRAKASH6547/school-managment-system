import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSelectedBranchId, requireBranchAccess, requireOrganization } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/permissions";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    requirePermission(session, "fees.verify", "write");
    requireOrganization(session);
    const orgId = session.organizationId!;
    const branchId = await requireBranchAccess(orgId, await getSelectedBranchId());
    const { id } = await params;
    const payment = await prisma.payment.findFirst({
      where: { id, organizationId: orgId, branchId },
    });
    if (!payment) return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    if (payment.verifiedAt) {
      return NextResponse.json({ error: "Already verified" }, { status: 400 });
    }
    await prisma.payment.update({
      where: { id },
      data: {
        status: "verified",
        verifiedAt: new Date(),
        verifiedBy: session.id,
      },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Error && e.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
