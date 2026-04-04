import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { requireSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { notifyEmailAndWhatsApp } from "@/lib/notifications";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    requireSuperAdmin(session);

    const { id } = await params;
    const before = await prisma.organization.findUnique({
      where: { id },
      select: { name: true, email: true, phone: true },
    });
    await prisma.organization.update({
      where: { id },
      data: { status: "rejected" },
    });
    if (before?.email) {
      void notifyEmailAndWhatsApp({
        emails: [before.email],
        phones: before.phone ? [before.phone] : [],
        subject: `Registration update: ${before.name}`,
        html: `<p>Your organization registration for <strong>${before.name}</strong> was not approved.</p>
          <p>If you believe this is a mistake, reply to the platform contact or submit a new inquiry.</p>`,
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
