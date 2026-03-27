import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getSession, getSelectedBranchId, requireOrganization, resolveBranchIdForOrganization } from "@/lib/auth";
import { prisma } from "@/lib/db";

async function generateUniqueResultToken(): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const token = randomBytes(24).toString("base64url");
    const exists = await prisma.student.findFirst({
      where: { resultToken: token },
      select: { id: true },
    });
    if (!exists) return token;
  }
  return randomBytes(32).toString("base64url");
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    requireOrganization(session);
    if (session.role !== "school_admin" && session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    const branchId = await resolveBranchIdForOrganization(session.organizationId!, await getSelectedBranchId());
    const { id } = await params;

    const student = await prisma.student.findFirst({
      where: { id, organizationId: session.organizationId!, branchId },
      select: { id: true },
    });
    if (!student) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const disabledToken = `disabled_${randomBytes(16).toString("hex")}`;
    await prisma.student.update({
      where: { id: student.id },
      data: { resultToken: disabledToken },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    requireOrganization(session);
    if (session.role !== "school_admin" && session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    const branchId = await resolveBranchIdForOrganization(session.organizationId!, await getSelectedBranchId());
    const { id } = await params;

    const student = await prisma.student.findFirst({
      where: { id, organizationId: session.organizationId!, branchId },
      select: { id: true },
    });
    if (!student) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const token = await generateUniqueResultToken();
    await prisma.student.update({
      where: { id: student.id },
      data: { resultToken: token },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

