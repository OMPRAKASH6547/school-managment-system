import { NextRequest, NextResponse } from "next/server";
import { getSession, getSelectedBranchId, resolveBranchIdForOrganization, requireOrganization } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { requirePermission } from "@/lib/permissions";
import { randomBytes } from "crypto";
import {
  firstZodIssueMessage,
  LIMITS,
  zAadhaar,
  zBloodGroup,
  zCuidId,
  zEmailOpt,
  zIsoDateString,
  zOptionalStr,
  zPersonName,
  zPhoneOpt,
  zPinOpt,
} from "@/lib/field-validation";

const bodySchema = z.object({
  aadhaarNo: zAadhaar,
  bloodGroup: zBloodGroup,
  firstName: zPersonName,
  lastName: zPersonName,
  email: zEmailOpt,
  phone: zPhoneOpt,
  dateOfBirth: zIsoDateString,
  gender: zOptionalStr(LIMITS.gender),
  address: zOptionalStr(LIMITS.longText),
  village: zOptionalStr(LIMITS.shortLabel),
  policeStation: zOptionalStr(LIMITS.shortLabel),
  postOffice: zOptionalStr(LIMITS.shortLabel),
  district: zOptionalStr(LIMITS.shortLabel),
  pinCode: zPinOpt,
  state: zOptionalStr(LIMITS.shortLabel),
  fatherName: zOptionalStr(LIMITS.personName),
  motherName: zOptionalStr(LIMITS.personName),
  motherPhone: zPhoneOpt,
  category: zOptionalStr(LIMITS.category),
  guardianName: zOptionalStr(LIMITS.personName),
  guardianPhone: zPhoneOpt,
  classId: z.preprocess((v) => (v === "" || v === undefined ? null : v), z.union([z.null(), zCuidId])),
  status: zOptionalStr(LIMITS.statusKey),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    requirePermission(session, "students", "write");
    requireOrganization(session);
    const branchId = await resolveBranchIdForOrganization(session.organizationId!, await getSelectedBranchId());
    const { id } = await params;
    const student = await prisma.student.findFirst({
      where: { id, organizationId: session.organizationId!, branchId },
    });
    if (!student) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const data = bodySchema.parse(await req.json());

    const generateUniqueRollNo = async (params: {
      organizationId: string;
      branchId: string;
      dateOfBirth: Date | null;
    }): Promise<string> => {
      const { organizationId, branchId, dateOfBirth } = params;
      const nowYY = String(new Date().getFullYear()).slice(-2);
      const dobYear = dateOfBirth ? dateOfBirth.getFullYear() : new Date().getFullYear();
      const dobYY = String(dobYear).slice(-2);
      for (let attempt = 0; attempt < 120; attempt++) {
        const random2 = String(Math.floor(Math.random() * 100)).padStart(2, "0");
        const candidate = `${nowYY}${dobYY}${random2}`;
        const exists = await prisma.student.findFirst({
          where: { organizationId, branchId, rollNo: candidate },
          select: { id: true },
        });
        if (!exists) return candidate;
      }
      return `${nowYY}${dobYY}${String(Date.now()).slice(-4)}`;
    };

    // Roll number is system-managed only.
    const rollNo =
      student.rollNo ??
      (await generateUniqueRollNo({
        organizationId: session.organizationId!,
        branchId,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : student.dateOfBirth,
      }));

    const generateUniqueResultToken = async (): Promise<string> => {
      // Ensure token is non-null so Mongo unique index never collides on `null`.
      for (let attempt = 0; attempt < 20; attempt++) {
        const token = randomBytes(12).toString("base64url");
        const exists = await prisma.student.findFirst({
          where: { resultToken: token },
          select: { id: true },
        });
        if (!exists) return token;
      }
      return randomBytes(16).toString("base64url");
    };

    const resultToken =
      student.resultToken && student.resultToken.trim().length > 0 ? student.resultToken : await generateUniqueResultToken();
    await prisma.student.update({
      where: { id },
      data: {
        rollNo,
        aadhaarNo: data.aadhaarNo,
        bloodGroup: data.bloodGroup,
        resultToken,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email ?? null,
        phone: data.phone ?? null,
        dateOfBirth: new Date(data.dateOfBirth),
        gender: data.gender ?? null,
        address: data.address ?? null,
        village: data.village ?? null,
        policeStation: data.policeStation ?? null,
        postOffice: data.postOffice ?? null,
        district: data.district ?? null,
        pinCode: data.pinCode ?? null,
        state: data.state ?? null,
        fatherName: data.fatherName ?? null,
        motherName: data.motherName ?? null,
        motherPhone: data.motherPhone ?? null,
        category: data.category ?? null,
        guardianName: data.guardianName ?? null,
        guardianPhone: data.guardianPhone ?? null,
        classId: data.classId ?? null,
        status: data.status ?? student.status,
      },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: firstZodIssueMessage(e) }, { status: 400 });
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
    requirePermission(session, "students", "write");
    requireOrganization(session);
    const branchId = await resolveBranchIdForOrganization(session.organizationId!, await getSelectedBranchId());
    const { id } = await params;
    const student = await prisma.student.findFirst({
      where: { id, organizationId: session.organizationId!, branchId },
      select: { id: true },
    });
    if (!student) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const [activeAllocations, activeIssues, sales] = await Promise.all([
      prisma.hostelAllocation.findMany({
        where: { organizationId: session.organizationId!, branchId, studentId: id, status: "active" },
        select: { roomId: true },
      }),
      prisma.libraryIssue.findMany({
        where: { organizationId: session.organizationId!, branchId, studentId: id, status: "issued" },
        select: { id: true, bookId: true },
      }),
      prisma.bookSale.findMany({
        where: { organizationId: session.organizationId!, branchId, studentId: id },
        select: { id: true },
      }),
    ]);

    await prisma.$transaction(async (tx) => {
      await tx.attendance.deleteMany({
        where: { organizationId: session.organizationId!, branchId, studentId: id },
      });
      await tx.examResult.deleteMany({
        where: { organizationId: session.organizationId!, branchId, studentId: id },
      });
      await tx.transportStudentAssignment.deleteMany({
        where: { organizationId: session.organizationId!, branchId, studentId: id },
      });
      await tx.hostelAllocation.deleteMany({
        where: { organizationId: session.organizationId!, branchId, studentId: id },
      });
      await tx.payment.deleteMany({
        where: { organizationId: session.organizationId!, branchId, studentId: id },
      });
      await tx.libraryIssue.deleteMany({
        where: { organizationId: session.organizationId!, branchId, studentId: id },
      });

      if (sales.length > 0) {
        const saleIds = sales.map((s) => s.id);
        await tx.bookSaleItem.deleteMany({
          where: { saleId: { in: saleIds } },
        });
        await tx.bookSale.deleteMany({
          where: { id: { in: saleIds } },
        });
      }

      // Restore available copies for active issues being deleted.
      if (activeIssues.length > 0) {
        const issueCountByBook = activeIssues.reduce<Record<string, number>>((acc, issue) => {
          acc[issue.bookId] = (acc[issue.bookId] ?? 0) + 1;
          return acc;
        }, {});
        for (const [bookId, count] of Object.entries(issueCountByBook)) {
          await tx.libraryBook.update({
            where: { id: bookId },
            data: { availableCopies: { increment: count } },
          });
        }
      }

      // Keep hostel occupancy accurate when active allocations are removed.
      if (activeAllocations.length > 0) {
        const countByRoom = activeAllocations.reduce<Record<string, number>>((acc, row) => {
          acc[row.roomId] = (acc[row.roomId] ?? 0) + 1;
          return acc;
        }, {});
        for (const [roomId, count] of Object.entries(countByRoom)) {
          const room = await tx.hostelRoom.findUnique({ where: { id: roomId }, select: { id: true, currentOccupancy: true } });
          if (room) {
            await tx.hostelRoom.update({
              where: { id: room.id },
              data: { currentOccupancy: Math.max(0, room.currentOccupancy - count) },
            });
          }
        }
      }

      await tx.student.delete({ where: { id } });
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Error && e.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
