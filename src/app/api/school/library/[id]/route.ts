import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession, getSelectedBranchId, requireOrganization, resolveBranchIdForOrganization } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/permissions";

const bodySchema = z.object({
  title: z.string().min(1),
  author: z.string().optional(),
  isbn: z.string().optional(),
  category: z.string().optional(),
  totalCopies: z.number().int().min(1),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    requirePermission(session, "library", "write");
    requireOrganization(session);
    const orgId = session.organizationId!;
    const branchId = await resolveBranchIdForOrganization(orgId, await getSelectedBranchId());
    const { id } = await params;
    const data = bodySchema.parse(await req.json());

    const book = await prisma.libraryBook.findFirst({
      where: { id, organizationId: orgId, branchId },
      select: { id: true, totalCopies: true, availableCopies: true },
    });
    if (!book) return NextResponse.json({ error: "Book not found" }, { status: 404 });

    const issuedCount = Math.max(0, book.totalCopies - book.availableCopies);
    if (data.totalCopies < issuedCount) {
      return NextResponse.json(
        { error: `Total copies cannot be less than currently issued (${issuedCount})` },
        { status: 400 }
      );
    }

    const nextAvailable = data.totalCopies - issuedCount;
    await prisma.libraryBook.update({
      where: { id: book.id },
      data: {
        title: data.title,
        author: data.author || null,
        isbn: data.isbn || null,
        category: data.category || null,
        totalCopies: data.totalCopies,
        availableCopies: nextAvailable,
      },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: e.errors[0]?.message }, { status: 400 });
    if (e instanceof Error && e.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
