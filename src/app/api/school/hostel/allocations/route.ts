import { NextRequest, NextResponse } from "next/server";
import { getSession, getSelectedBranchId, resolveBranchIdForOrganization, requireOrganization } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { requirePermission } from "@/lib/permissions";
import { notifyEmailAndWhatsApp } from "@/lib/notifications";
import { getSchoolNotifierEmails, studentFamilyPhones } from "@/lib/notification-recipients";

const bodySchema = z.object({
  roomId: z.string().min(1),
  studentId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    requirePermission(session, "hostel", "write");
    requireOrganization(session);
    const orgId = session.organizationId!;
    const branchId = await resolveBranchIdForOrganization(orgId, await getSelectedBranchId());
    const data = bodySchema.parse(await req.json());

    const room = await prisma.hostelRoom.findFirst({
      where: { id: data.roomId, organizationId: orgId, branchId },
    });
    if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

    const student = await prisma.student.findFirst({
      where: { id: data.studentId, organizationId: orgId, branchId },
    });
    if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

    if (room.currentOccupancy >= room.capacity) {
      return NextResponse.json({ error: "Room is full" }, { status: 400 });
    }

    const existing = await prisma.hostelAllocation.findFirst({
      where: { studentId: data.studentId, roomId: data.roomId, status: "active" },
    });
    if (existing) {
      return NextResponse.json({ error: "Student already in this room" }, { status: 400 });
    }

    await prisma.hostelAllocation.create({
      data: {
        roomId: data.roomId,
        studentId: data.studentId,
        organizationId: orgId,
        branchId,
        status: "active",
      },
    });
    await prisma.hostelRoom.update({
      where: { id: data.roomId },
      data: { currentOccupancy: { increment: 1 } },
    });

    const [org, adminEmails] = await Promise.all([
      prisma.organization.findUnique({
        where: { id: orgId },
        select: { name: true, email: true, phone: true },
      }),
      getSchoolNotifierEmails(orgId),
    ]);
    const stuName = `${student.firstName} ${student.lastName}`.trim();
    void notifyEmailAndWhatsApp({
      emails: [...adminEmails, org?.email, student.email].filter(Boolean) as string[],
      phones: [
        ...(org?.phone ? [org.phone] : []),
        ...studentFamilyPhones({
          phone: student.phone,
          motherPhone: student.motherPhone,
          guardianPhone: student.guardianPhone,
        }),
      ],
      subject: `Hostel allocation: ${room.name}`,
      html: `<p><strong>${stuName}</strong> has been allocated hostel room <strong>${room.name}</strong>${room.floor ? ` (floor ${room.floor})` : ""}.</p><p>${org?.name ?? "School"}</p>`,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: e.errors[0]?.message }, { status: 400 });
    if (e instanceof Error && e.message.includes("Unauthorized")) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
