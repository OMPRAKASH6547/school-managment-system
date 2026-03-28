import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSelectedBranchId, resolveBranchIdForOrganization, requireOrganization } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { requirePermission } from "@/lib/permissions";
import { firstZodIssueMessage, LIMITS, zOptionalStr } from "@/lib/field-validation";

const bodySchema = z.object({
  title: z.preprocess(
    (v) => (typeof v === "string" ? v.trim() : v),
    z.string().min(1).max(LIMITS.bookTitle),
  ),
  author: zOptionalStr(LIMITS.bookAuthor),
  isbn: zOptionalStr(LIMITS.isbn),
  category: zOptionalStr(LIMITS.libraryCategory),
  totalCopies: z.number().int().min(1).max(50_000),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    requirePermission(session, "library", "write");
    requireOrganization(session);
    const orgId = session.organizationId!;
    const branchId = await resolveBranchIdForOrganization(orgId, await getSelectedBranchId());
    const data = bodySchema.parse(await req.json());
    await prisma.libraryBook.create({
      data: {
        organizationId: orgId,
        branchId,
        title: data.title,
        author: data.author || null,
        isbn: data.isbn || null,
        category: data.category || null,
        totalCopies: data.totalCopies,
        availableCopies: data.totalCopies,
      },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: firstZodIssueMessage(e) }, { status: 400 });
    if (e instanceof Error && e.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
