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
    await prisma.organization.update({
      where: { id },
      data: {
        status: "approved",
        approvedAt: new Date(),
        approvedBy: session.id,
      },
    });
    const org = await prisma.organization.findUnique({
      where: { id },
      select: { name: true, email: true, phone: true },
    });
    if (org?.email) {
      void notifyEmailAndWhatsApp({
        emails: [org.email],
        phones: org.phone ? [org.phone] : [],
        subject: `Approved: ${org.name}`,
        html: `<p>Your organization <strong>${org.name}</strong> has been <strong>approved</strong>.</p>
          <p>You can sign in to your school dashboard with your registered email.</p>`,
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
