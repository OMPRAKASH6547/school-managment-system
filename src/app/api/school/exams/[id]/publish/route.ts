import { NextResponse } from "next/server";
import { getSession, requireSchoolAdmin, requireOrganization } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { randomBytes } from "crypto";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    requireSchoolAdmin(session);
    requireOrganization(session);

    const { id } = await params;

    const exam = await prisma.exam.findFirst({
      where: {
        id,
        organizationId: session.organizationId!,
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

        return prisma.student.update({
          where: { id: studentId },
          data: { resultToken: token },
        });
      })
    );

    await prisma.exam.update({
      where: { id },
      data: { status: "published" },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}