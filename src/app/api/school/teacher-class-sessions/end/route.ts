import { NextRequest, NextResponse } from "next/server";
import { getSession, getSelectedBranchId, resolveBranchIdForOrganization, requireOrganization } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { findOpenTeacherClassSessions } from "@/lib/teacher-class-session";
import { notifyEmailAndWhatsApp } from "@/lib/notifications";
import { getSchoolNotifierEmails } from "@/lib/notification-recipients";
import { z } from "zod";

const bodySchema = z.object({
  classId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    requireOrganization(session);
    if (session.role !== "teacher" && session.role !== "staff") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const orgId = session.organizationId!;
    const branchId = await resolveBranchIdForOrganization(orgId, await getSelectedBranchId());
    const body = bodySchema.parse(await req.json());

    const teacherStaff = await prisma.staff.findFirst({
      where: { email: session.email, organizationId: orgId, branchId, status: "active", role: "teacher" },
      select: { id: true },
    });
    if (!teacherStaff) return NextResponse.json({ error: "Teacher not found" }, { status: 404 });

    const assignment = await prisma.teacherAssignment.findFirst({
      where: {
        teacherStaffId: teacherStaff.id,
        classId: body.classId,
        organizationId: orgId,
        branchId,
      },
      select: { id: true },
    });
    if (!assignment) return NextResponse.json({ error: "Not assigned to this class" }, { status: 403 });

    const openForClass = await findOpenTeacherClassSessions(orgId, branchId, teacherStaff.id, {
      classId: body.classId,
    });
    if (openForClass.length === 0) {
      return NextResponse.json({ error: "No active session for this class" }, { status: 404 });
    }

    const endedAt = new Date();
    await Promise.all(
      openForClass.map((s) =>
        prisma.teacherClassSession.update({
          where: { id: s.id },
          data: { endedAt },
        })
      )
    );

    const [cls, teacherName, org, adminEmails] = await Promise.all([
      prisma.class.findFirst({
        where: { id: body.classId, organizationId: orgId, branchId },
        select: { name: true },
      }),
      prisma.staff.findFirst({
        where: { id: teacherStaff.id },
        select: { firstName: true, lastName: true },
      }),
      prisma.organization.findUnique({
        where: { id: orgId },
        select: { name: true, phone: true },
      }),
      getSchoolNotifierEmails(orgId),
    ]);
    void notifyEmailAndWhatsApp({
      emails: adminEmails,
      phones: org?.phone ? [org.phone] : [],
      subject: `Class ended: ${cls?.name ?? "Batch"}`,
      html: `<p><strong>${teacherName?.firstName ?? ""} ${teacherName?.lastName ?? ""}</strong> ended class <strong>${cls?.name ?? "—"}</strong> at ${endedAt.toLocaleString()} (${org?.name ?? "School"}).</p>`,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.errors[0]?.message }, { status: 400 });
    }
    if (e instanceof Error) {
      const msg = e.message ?? "Failed";
      const status = msg.includes("No organization") || msg.includes("No organization assigned") ? 401 : msg.includes("Unauthorized") ? 403 : 500;
      return NextResponse.json({ error: msg }, { status });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

