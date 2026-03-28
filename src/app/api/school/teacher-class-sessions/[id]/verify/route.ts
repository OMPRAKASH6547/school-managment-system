import { NextResponse } from "next/server";
import { getSession, getSelectedBranchId, resolveBranchIdForOrganization, requireOrganization } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/permissions";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    requirePermission(session, "classes", "write");
    requireOrganization(session);
    const orgId = session.organizationId!;
    const branchId = await resolveBranchIdForOrganization(orgId, await getSelectedBranchId());
    const { id } = await params;

    const row = await prisma.teacherClassSession.findFirst({
      where: { id, organizationId: orgId, branchId },
      select: { id: true, verifiedAt: true },
    });
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (row.verifiedAt) return NextResponse.json({ error: "Already verified" }, { status: 400 });

    await prisma.teacherClassSession.update({
      where: { id },
      data: { verifiedAt: new Date() },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Error && e.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
