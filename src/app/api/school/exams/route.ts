import { NextRequest, NextResponse } from "next/server";
import { getSession, getSelectedBranchId, resolveBranchIdForOrganization, requireOrganization } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { requirePermission } from "@/lib/permissions";
import {
  firstZodIssueMessage,
  LIMITS,
  zCuidId,
  zOptionalStr,
} from "@/lib/field-validation";

const bodySchema = z.object({
  organizationId: zCuidId,
  name: z.preprocess(
    (v) => (typeof v === "string" ? v.trim() : v),
    z.string().min(1).max(LIMITS.examName),
  ),
  examType: z.preprocess(
    (v) => (typeof v === "string" ? v.trim() : v),
    z.string().min(1).max(LIMITS.examType),
  ),
  classId: zCuidId,
  academicYear: zOptionalStr(LIMITS.academicYear),
  subjects: z
    .array(
      z.object({
        name: z.preprocess(
          (v) => (typeof v === "string" ? v.trim() : v),
          z.string().min(1).max(LIMITS.subjectName),
        ),
        maxMarks: z.number().min(0).max(100_000),
      }),
    )
    .min(1)
    .max(LIMITS.maxSubjectsPerExam),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    requirePermission(session, "examinations", "write");
    requireOrganization(session);
    const body = await req.json();
    const data = bodySchema.parse(body);
    if (data.organizationId !== session.organizationId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const cookieBranchId = await resolveBranchIdForOrganization(
      session.organizationId!,
      await getSelectedBranchId()
    );
    const selectedClass = await prisma.class.findFirst({
      where: { id: data.classId, organizationId: data.organizationId, status: "active" },
      select: { id: true, branchId: true },
    });
    if (!selectedClass) {
      return NextResponse.json({ error: "Invalid class" }, { status: 400 });
    }
    // Use class branch when available to avoid cookie/branch mismatch failures.
    const branchId = selectedClass.branchId ?? cookieBranchId;

    const exam = await prisma.exam.create({
      data: {
        organizationId: data.organizationId,
        branchId,
        name: data.name,
        examType: data.examType,
        classId: data.classId,
        academicYear: data.academicYear ?? null,
        status: "draft",
        subjects: {
          create: data.subjects.map((s, i) => ({
            name: s.name,
            maxMarks: s.maxMarks,
            order: i,
            // branch/org are optional in schema, but setting them helps branch isolation later
            organizationId: data.organizationId,
            branchId,
          })),
        },
      },
      include: { subjects: true },
    });
    return NextResponse.json({ ok: true, id: exam.id });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: firstZodIssueMessage(e) }, { status: 400 });
    }
    if (e instanceof Error && e.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    if (e instanceof Error) {
      return NextResponse.json({ error: e.message || "Failed" }, { status: 500 });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
