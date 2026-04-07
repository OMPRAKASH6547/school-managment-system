import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getLoggedInStudent } from "@/lib/student-auth";

const updateSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().min(3).max(1000),
  tags: z.array(z.string().trim().min(1).max(40)).max(8).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    const student = await getLoggedInStudent(session);
    if (!student) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const data = updateSchema.parse(await req.json());
    const updated = await prisma.classReview.updateMany({
      where: { id, studentId: student.id, organizationId: student.organizationId, branchId: student.branchId ?? null },
      data: { rating: data.rating, comment: data.comment, tags: data.tags ?? [] },
    });
    if (!updated.count) return NextResponse.json({ error: "Review not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: e.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    return NextResponse.json({ error: "Failed to update review" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  const student = await getLoggedInStudent(session);
  if (!student) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const deleted = await prisma.classReview.deleteMany({
    where: { id, studentId: student.id, organizationId: student.organizationId, branchId: student.branchId ?? null },
  });
  if (!deleted.count) return NextResponse.json({ error: "Review not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
