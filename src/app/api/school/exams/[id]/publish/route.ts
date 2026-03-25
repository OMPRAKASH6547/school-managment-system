import { NextResponse } from "next/server";
import { getSession, getSelectedBranchId, requireBranchAccess, requireOrganization } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { randomBytes } from "crypto";
import { requirePermission } from "@/lib/permissions";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    requirePermission(session, "examinations.publish", "write");
    requireOrganization(session);
    const branchId = await requireBranchAccess(session.organizationId!, await getSelectedBranchId());

    const { id } = await params;

    const exam = await prisma.exam.findFirst({
      where: {
        id,
        organizationId: session.organizationId!,
        branchId,
      },
      include: {
        results: {
          select: { studentId: true },
        },
      },
    });

    if (!exam) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // ✅ FIX: Use Array.from instead of spread
    const studentIds = Array.from(
      new Set(exam.results.map((r) => r.studentId))
    );

    // (Optional but better) parallel execution
    await Promise.all(
      studentIds.map((studentId) => {
        const token = randomBytes(24).toString("base64url");
        // Enforce branch isolation when updating resultToken
        return prisma.student.updateMany({
          where: { id: studentId, organizationId: session.organizationId!, branchId },
          data: { resultToken: token },
        });
      })
    );

    const update = await prisma.exam.updateMany({
      where: { id, organizationId: session.organizationId!, branchId },
      data: { status: "published" },
    });
    if (update.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}