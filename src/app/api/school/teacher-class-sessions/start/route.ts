import { NextRequest, NextResponse } from "next/server";
import { getSession, getSelectedBranchId, resolveBranchIdForOrganization, requireOrganization } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { findOpenTeacherClassSessions, getLocalDayRange } from "@/lib/teacher-class-session";
import { notifyEmailAndWhatsApp } from "@/lib/notifications";
import { getSchoolNotifierEmails } from "@/lib/notification-recipients";
import { z } from "zod";

const bodySchema = z.object({
  classId: z.string().min(1),
  autoMarkAttendance: z.boolean().optional(),
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

    const { start: dayStart, end: dayEnd } = getLocalDayRange();

    const todayForClass = await prisma.teacherClassSession.findMany({
      where: {
        organizationId: orgId,
        branchId,
        teacherStaffId: teacherStaff.id,
        classId: body.classId,
        startedAt: { gte: dayStart, lt: dayEnd },
      },
      select: { endedAt: true },
    });
    if (todayForClass.some((r) => r.endedAt != null)) {
      return NextResponse.json(
        {
          error:
            "This class was already completed today. You cannot start another session for the same class until tomorrow.",
        },
        { status: 400 }
      );
    }

    const openSessions = await findOpenTeacherClassSessions(orgId, branchId, teacherStaff.id);
    const openForThisClass = openSessions.filter((s) => s.classId === body.classId);
    if (openForThisClass.length > 0) {
      return NextResponse.json({ error: "Session already started for this class" }, { status: 400 });
    }
    const openOther = openSessions.filter((s) => s.classId !== body.classId);
    if (openOther.length > 0) {
      return NextResponse.json(
        { error: "Another class is already active. End it first." },
        { status: 400 }
      );
    }

    await prisma.teacherClassSession.create({
      data: {
        organizationId: orgId,
        branchId,
        teacherStaffId: teacherStaff.id,
        classId: body.classId,
        endedAt: null,
      },
    });

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
      subject: `Class started: ${cls?.name ?? "Batch"}`,
      html: `<p><strong>${teacherName?.firstName ?? ""} ${teacherName?.lastName ?? ""}</strong> started class <strong>${cls?.name ?? "—"}</strong> at ${new Date().toLocaleString()} (${org?.name ?? "School"}).</p>`,
    });

    if (body.autoMarkAttendance) {
      const attendanceDate = new Date();
      attendanceDate.setHours(0, 0, 0, 0);
      const students = await prisma.student.findMany({
        where: { organizationId: orgId, branchId, classId: body.classId, status: "active" },
        select: { id: true },
      });
      for (const student of students) {
        await prisma.attendance.upsert({
          where: {
            studentId_date: { studentId: student.id, date: attendanceDate },
          },
          create: {
            organizationId: orgId,
            branchId,
            studentId: student.id,
            date: attendanceDate,
            status: "present",
          },
          update: {},
        });
      }
    }

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

