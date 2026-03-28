import { NextRequest, NextResponse } from "next/server";
import { getSession, getSelectedBranchId, requireOrganization, resolveBranchIdForOrganization } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { requirePermission } from "@/lib/permissions";
import { firstZodIssueMessage, LIMITS, zOptionalStr } from "@/lib/field-validation";

const bodySchema = z.object({
  name: z.preprocess(
    (v) => (typeof v === "string" ? v.trim() : v),
    z.string().min(1).max(LIMITS.className),
  ),
  subjects: z.array(z.string().min(1).max(120)).max(LIMITS.maxSubjectsPerExam).optional(),
  section: zOptionalStr(LIMITS.section),
  academicYear: zOptionalStr(LIMITS.academicYear),
  capacity: z.number().int().min(0).max(50_000).nullable().optional(),
  room: zOptionalStr(LIMITS.room),
  status: zOptionalStr(LIMITS.statusKey),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    requirePermission(session, "classes", "write");
    requireOrganization(session);
    const orgId = session.organizationId!;
    const branchId = await resolveBranchIdForOrganization(orgId, await getSelectedBranchId());

    const raw = await req.json();
    const data = bodySchema.parse({
      ...raw,
      subjects: Array.isArray(raw.subjects) ? raw.subjects : [],
      capacity: raw.capacity != null ? Number(raw.capacity) : null,
    });

    const subjectsText = (data.subjects ?? []).map((s) => s.trim()).filter(Boolean).join(", ");
    try {
      await prisma.class.create({
        data: ({
          organizationId: orgId,
          branchId,
          name: data.name,
          subjects: subjectsText || null,
          section: data.section ?? null,
          academicYear: data.academicYear ?? null,
          capacity: data.capacity ?? null,
          room: data.room ?? null,
          status: data.status ?? "active",
        } as any),
      });
    } catch {
      await prisma.class.create({
        data: {
          organizationId: orgId,
          branchId,
          name: data.name,
          section: data.section ?? null,
          academicYear: data.academicYear ?? null,
          capacity: data.capacity ?? null,
          room: data.room ?? null,
          status: data.status ?? "active",
        },
      });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: firstZodIssueMessage(e) }, { status: 400 });
    }
    if (e instanceof Error && e.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 500 },
    );
  }
}
