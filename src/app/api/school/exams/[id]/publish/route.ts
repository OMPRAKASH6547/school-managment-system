import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { requireSchoolAdmin, requireOrganization } from "@/lib/auth";
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
      where: { id, organizationId: session.organizationId! },
      include: { results: { select: { studentId: true } } },
    });
    if (!exam) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const studentIds = [...new Set(exam.results.map((r) => r.studentId))];
    for (const studentId of studentIds) {
      const token = randomBytes(24).toString("base64url");
      await prisma.student.update({
        where: { id: studentId },
        data: { resultToken: token },
      });
    }

    await prisma.exam.update({
      where: { id },
      data: { status: "published" },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
