import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession, getSelectedBranchId, requireOrganization, resolveBranchIdForOrganization } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/permissions";

const bodySchema = z.object({
  bookId: z.string().min(1),
  studentId: z.string().min(1),
  dueDate: z.string().nullable().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    requirePermission(session, "library", "write");
    requireOrganization(session);
    const orgId = session.organizationId!;
    const branchId = await resolveBranchIdForOrganization(orgId, await getSelectedBranchId());
    const data = bodySchema.parse(await req.json());

    const [book, student] = await Promise.all([
      prisma.libraryBook.findFirst({
        where: { id: data.bookId, organizationId: orgId, branchId },
        select: { id: true, availableCopies: true },
      }),
      prisma.student.findFirst({
        where: { id: data.studentId, organizationId: orgId, branchId },
        select: { id: true },
      }),
    ]);

    if (!book) return NextResponse.json({ error: "Book not found" }, { status: 404 });
    if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });
    if (book.availableCopies <= 0) {
      return NextResponse.json({ error: "No available copies to assign" }, { status: 400 });
    }

    await prisma.$transaction([
      prisma.libraryIssue.create({
        data: {
          bookId: book.id,
          studentId: student.id,
          organizationId: orgId,
          branchId,
          dueDate: data.dueDate ? new Date(data.dueDate) : null,
          returnedAt: null,
          status: "issued",
        },
      }),
      prisma.libraryBook.update({
        where: { id: book.id },
        data: { availableCopies: { decrement: 1 } },
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: e.errors[0]?.message }, { status: 400 });
    if (e instanceof Error && e.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
