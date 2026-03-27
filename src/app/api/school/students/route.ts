import { NextRequest, NextResponse } from "next/server";
import { getSession, getSelectedBranchId, resolveBranchIdForOrganization, requireOrganization } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { requirePermission } from "@/lib/permissions";
import { randomBytes } from "crypto";
import { sendNotificationEmail } from "@/lib/notifications";

const bodySchema = z.object({
  organizationId: z.string(),
  aadhaarNo: z.string().optional(),
  bloodGroup: z.string().optional(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().optional(),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  address: z.string().optional(),
  guardianName: z.string().optional(),
  guardianPhone: z.string().optional(),
  classId: z.string().nullable().optional(),
  status: z.string().optional(),
  admissionAmount: z.number().positive(),
  paymentMethod: z.enum(["cash", "online"]),
  paymentReference: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    requirePermission(session, "students", "write");
    requireOrganization(session);
    const body = await req.json();
    const data = bodySchema.parse(body);
    if (data.organizationId !== session.organizationId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const branchId = await resolveBranchIdForOrganization(session.organizationId!, await getSelectedBranchId());

    async function generateUniqueResultToken(params: {
      organizationId: string;
      branchId: string;
    }): Promise<string> {
      void params;

      // Ensure token is non-null so Mongo unique index never collides on `null`.
      for (let attempt = 0; attempt < 20; attempt++) {
        const token = randomBytes(12).toString("base64url");
        const exists = await prisma.student.findFirst({
          where: { resultToken: token },
          select: { id: true },
        });
        if (!exists) return token;
      }

      // Extremely unlikely fallback.
      return randomBytes(16).toString("base64url");
    }

    async function generateUniqueRollNo(params: {
      organizationId: string;
      branchId: string;
      dateOfBirth: Date;
    }): Promise<string> {
      const { organizationId, branchId, dateOfBirth } = params;
      const nowYY = String(new Date().getFullYear()).slice(-2);
      const dobYY = String(dateOfBirth.getFullYear()).slice(-2);

      for (let attempt = 0; attempt < 120; attempt++) {
        const random2 = String(Math.floor(Math.random() * 100)).padStart(2, "0");
        const candidate = `${nowYY}${dobYY}${random2}`;
        const exists = await prisma.student.findFirst({
          where: { organizationId, branchId, rollNo: candidate },
          select: { id: true },
        });
        if (!exists) return candidate;
      }

      // Very unlikely fallback preserving the requested prefix.
      return `${nowYY}${dobYY}${String(Date.now()).slice(-4)}`;
    }

    const aadhaarNo = data.aadhaarNo?.trim() || null;
    const bloodGroup = data.bloodGroup?.trim() || null;

    if (!data.dateOfBirth) {
      return NextResponse.json({ error: "Date of birth is required" }, { status: 400 });
    }
    if (!aadhaarNo) {
      return NextResponse.json({ error: "Aadhaar number is required" }, { status: 400 });
    }
    if (!bloodGroup) {
      return NextResponse.json({ error: "Blood group is required" }, { status: 400 });
    }

    const rollNo = await generateUniqueRollNo({
      organizationId: session.organizationId!,
      branchId,
      dateOfBirth: new Date(data.dateOfBirth),
    });

    const resultToken = await generateUniqueResultToken({
      organizationId: data.organizationId,
      branchId,
    });

    let createdStudent;
    try {
      createdStudent = await prisma.student.create({
        data: {
          organizationId: data.organizationId,
          branchId,
          rollNo,
          aadhaarNo,
          bloodGroup,
          resultToken,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email || null,
          phone: data.phone || null,
          dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
          gender: data.gender || null,
          address: data.address || null,
          guardianName: data.guardianName || null,
          guardianPhone: data.guardianPhone || null,
          createdBy: session.id,
          classId: data.classId || null,
          status: data.status || "active",
        } as any,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes("Unknown argument `organizationId`")) throw error;

      // Compatibility fallback for Prisma clients that require relation connect syntax.
      createdStudent = await prisma.student.create({
        data: {
          organization: { connect: { id: data.organizationId } },
          branchId,
          rollNo,
          aadhaarNo,
          bloodGroup,
          resultToken,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email || null,
          phone: data.phone || null,
          dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
          gender: data.gender || null,
          address: data.address || null,
          guardianName: data.guardianName || null,
          guardianPhone: data.guardianPhone || null,
          createdBy: session.id,
          class: data.classId ? { connect: { id: data.classId } } : undefined,
          status: data.status || "active",
        } as any,
      });
    }

    let admissionPaymentId: string | null = null;
    const admissionAmount = Number(data.admissionAmount);
    const method = data.paymentMethod;
    const payment = await prisma.payment.create({
      data: {
        organizationId: data.organizationId,
        branchId,
        studentId: createdStudent.id,
        amount: admissionAmount,
        method,
        reference: data.paymentReference?.trim() || null,
        feePlanId: null,
        notes: "Admission fee",
        // Admission payment must be verified later from payment verification flow.
        status: "pending",
        verifiedAt: null,
        verifiedBy: null,
      },
      select: { id: true },
    });
    admissionPaymentId = payment.id;

    const org = await prisma.organization.findUnique({
      where: { id: data.organizationId },
      select: { name: true, email: true },
    });
    const creator = await prisma.user.findUnique({
      where: { id: session.id },
      select: { name: true, email: true },
    });

    await sendNotificationEmail({
      to: [org?.email, data.email].filter(Boolean) as string[],
      subject: `New admission: ${data.firstName} ${data.lastName}`,
      html: `
        <p>New student admission created.</p>
        <p><strong>Student:</strong> ${data.firstName} ${data.lastName}</p>
        <p><strong>Roll:</strong> ${rollNo ?? "-"}</p>
        <p><strong>Aadhaar:</strong> ${aadhaarNo}</p>
        <p><strong>Blood Group:</strong> ${bloodGroup}</p>
        <p><strong>Created By:</strong> ${creator?.name ?? "-"}</p>
        <p><strong>Admission Fee:</strong> ${admissionAmount > 0 ? `INR ${admissionAmount}` : "Not recorded"}</p>
      `,
    });

    return NextResponse.json({ ok: true, studentId: createdStudent.id, admissionPaymentId });
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
