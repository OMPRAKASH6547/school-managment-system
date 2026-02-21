import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { requireSchoolAdmin, requireOrganization } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    requireSchoolAdmin(session);
    requireOrganization(session);
    const orgId = session.organizationId!;
    const { id } = await params;
    const payment = await prisma.payment.findFirst({
      where: { id, organizationId: orgId },
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
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
