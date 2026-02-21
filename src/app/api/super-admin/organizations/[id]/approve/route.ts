import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { requireSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    requireSuperAdmin(session);

    const { id } = await params;
    await prisma.organization.update({
      where: { id },
      data: {
        status: "approved",
        approvedAt: new Date(),
        approvedBy: session.id,
      },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Error && e.message.includes("Unauthorized")) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
