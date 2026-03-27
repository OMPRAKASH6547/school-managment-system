import { NextRequest, NextResponse } from "next/server";
import { getSession, getSelectedBranchId, resolveBranchIdForOrganization, requireOrganization } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { requirePermission } from "@/lib/permissions";

const bodySchema = z.object({
  name: z.string().min(1),
  subjects: z.array(z.string().min(1)).optional(),
  section: z.string().optional(),
  academicYear: z.string().optional(),
  capacity: z.number().nullable().optional(),
  room: z.string().optional(),
  status: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    requirePermission(session, "classes", "write");
    requireOrganization(session);
    const { id } = await params;
    const branchId = await resolveBranchIdForOrganization(session.organizationId!, await getSelectedBranchId());
    const cls = await prisma.class.findFirst({
      where: { id, organizationId: session.organizationId!, branchId },
    });
    if (!cls) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const raw = await req.json();
    const data = bodySchema.parse({
      ...raw,
      subjects: Array.isArray(raw.subjects) ? raw.subjects : [],
      capacity: raw.capacity != null ? Number(raw.capacity) : null,
    });

    const subjectsText = (data.subjects ?? []).map((s) => s.trim()).filter(Boolean).join(", ");
    try {
      await prisma.class.update({
        where: { id },
        data: ({
          name: data.name,
          subjects: subjectsText || null,
          section: data.section ?? null,
          academicYear: data.academicYear ?? null,
          capacity: data.capacity ?? null,
          room: data.room ?? null,
          status: data.status ?? cls.status,
        } as any),
      });
    } catch {
      await prisma.class.update({
        where: { id },
        data: {
          name: data.name,
          section: data.section ?? null,
          academicYear: data.academicYear ?? null,
          capacity: data.capacity ?? null,
          room: data.room ?? null,
          status: data.status ?? cls.status,
        },
      });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.errors[0]?.message }, { status: 400 });
    }
    if (e instanceof Error && e.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    requirePermission(session, "classes", "write");
    requireOrganization(session);
    const { id } = await params;
    const branchId = await resolveBranchIdForOrganization(session.organizationId!, await getSelectedBranchId());
    const cls = await prisma.class.findFirst({
      where: { id, organizationId: session.organizationId!, branchId },
      select: { id: true },
    });
    if (!cls) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.$transaction(async (tx) => {
      // Students remain in the system; just detach class link.
      await tx.student.updateMany({
        where: { organizationId: session.organizationId!, branchId, classId: id },
        data: { classId: null },
      });

      // Remove class-linked fee plans.
      const planIds = (
        await tx.feePlan.findMany({
          where: { organizationId: session.organizationId!, branchId, classId: id },
          select: { id: true },
        })
      ).map((p) => p.id);
      if (planIds.length > 0) {
        await tx.payment.updateMany({
          where: { organizationId: session.organizationId!, branchId, feePlanId: { in: planIds } },
          data: { feePlanId: null },
        });
        await tx.feePlan.deleteMany({
          where: { organizationId: session.organizationId!, branchId, classId: id },
        });
      }

      // Remove teacher assignments tied to this class.
      await tx.teacherAssignment.deleteMany({
        where: { organizationId: session.organizationId!, branchId, classId: id },
      });
      await tx.teacherClassSession.deleteMany({
        where: { organizationId: session.organizationId!, branchId, classId: id },
      });

      // Remove exams and dependent rows for this class.
      const exams = await tx.exam.findMany({
        where: { organizationId: session.organizationId!, branchId, classId: id },
        select: { id: true },
      });
      const examIds = exams.map((e) => e.id);
      if (examIds.length > 0) {
        const subjects = await tx.examSubject.findMany({
          where: { examId: { in: examIds } },
          select: { id: true },
        });
        const subjectIds = subjects.map((s) => s.id);
        if (subjectIds.length > 0) {
          await tx.examResult.deleteMany({
            where: { organizationId: session.organizationId!, branchId, subjectId: { in: subjectIds } },
          });
          await tx.examSubject.deleteMany({
            where: { id: { in: subjectIds } },
          });
        }
        await tx.exam.deleteMany({
          where: { id: { in: examIds } },
        });
      }

      await tx.class.delete({ where: { id } });
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Error && e.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
