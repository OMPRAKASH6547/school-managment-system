import { NextResponse } from "next/server";
import { getSession, getSelectedBranchId, requireOrganization, resolveBranchIdForOrganization } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/permissions";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    requirePermission(session, "library", "write");
    requireOrganization(session);
    const orgId = session.organizationId!;
    const branchId = await resolveBranchIdForOrganization(orgId, await getSelectedBranchId());
    const { id } = await params;

    const issue = await prisma.libraryIssue.findFirst({
      // Allow returning legacy issue rows where org/branch may be null.
      where: { id },
      select: { id: true, status: true, returnedAt: true, bookId: true },
    });
    if (!issue) return NextResponse.json({ error: "Issue entry not found" }, { status: 404 });

    const book = await prisma.libraryBook.findFirst({
      where: { id: issue.bookId, organizationId: orgId, branchId },
      select: { id: true },
    });
    if (!book) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (issue.returnedAt || issue.status === "returned") {
      return NextResponse.json({ error: "Book already returned" }, { status: 400 });
    }

    await prisma.$transaction([
      prisma.libraryIssue.update({
        where: { id: issue.id },
        data: { returnedAt: new Date(), status: "returned" },
      }),
      prisma.libraryBook.update({
        where: { id: issue.bookId },
        data: { availableCopies: { increment: 1 } },
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Error && e.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
