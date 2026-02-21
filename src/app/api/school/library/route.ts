import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { requireSchoolAdmin, requireOrganization } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const bodySchema = z.object({
  title: z.string().min(1),
  author: z.string().optional(),
  isbn: z.string().optional(),
  category: z.string().optional(),
  totalCopies: z.number().int().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    requireSchoolAdmin(session);
    requireOrganization(session);
    const orgId = session.organizationId!;
    const data = bodySchema.parse(await req.json());
    await prisma.libraryBook.create({
      data: {
        organizationId: orgId,
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
    if (e instanceof z.ZodError) return NextResponse.json({ error: e.errors[0]?.message }, { status: 400 });
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
