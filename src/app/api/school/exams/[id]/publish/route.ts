import { NextResponse } from "next/server";
import { getSession, getSelectedBranchId, resolveBranchIdForOrganization, requireOrganization } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { randomBytes } from "crypto";
import { requirePermission } from "@/lib/permissions";
import { notifyEmailAndWhatsApp, sendNotificationEmail, sendNotificationWhatsApp, normalizeWhatsAppRecipient } from "@/lib/notifications";
import { getSchoolNotifierEmails, studentFamilyPhones } from "@/lib/notification-recipients";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    requirePermission(session, "examinations.publish", "write");
    requireOrganization(session);
    const branchId = await resolveBranchIdForOrganization(session.organizationId!, await getSelectedBranchId());

    const { id } = await params;

    const exam = await prisma.exam.findFirst({
      where: {
        id,
        organizationId: session.organizationId!,
        OR: [{ branchId }, { branchId: null }],
      },
      include: {
        results: {
          select: { studentId: true },
        },
      },
    });

    if (!exam) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // ✅ FIX: Use Array.from instead of spread
    const studentIds = Array.from(
      new Set(exam.results.map((r) => r.studentId))
    );

    // (Optional but better) parallel execution
    await Promise.all(
      studentIds.map((studentId) => {
        const token = randomBytes(24).toString("base64url");
        // Enforce branch isolation when updating resultToken
        return prisma.student.updateMany({
          where: { id: studentId, organizationId: session.organizationId! },
          data: { resultToken: token },
        });
      })
    );

    const update = await prisma.exam.updateMany({
      where: { id, organizationId: session.organizationId! },
      data: { status: "published" },
    });
    if (update.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const orgId = session.organizationId!;
    const [org, adminEmails] = await Promise.all([
      prisma.organization.findUnique({
        where: { id: orgId },
        select: { name: true, email: true, phone: true },
      }),
      getSchoolNotifierEmails(orgId),
    ]);
    void notifyEmailAndWhatsApp({
      emails: adminEmails,
      phones: org?.phone ? [org.phone] : [],
      subject: `Exam published: ${exam.name}`,
      html: `<p>Exam <strong>${exam.name}</strong> has been published.</p><p>${studentIds.length} student record(s) have updated result access.</p>`,
    });

    const students = await prisma.student.findMany({
      where: { id: { in: studentIds }, organizationId: orgId },
      select: {
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        motherPhone: true,
        guardianPhone: true,
      },
    });
    void Promise.allSettled(
      students.flatMap((st) => {
        const out: Promise<unknown>[] = [];
        if (st.email) {
          out.push(
            sendNotificationEmail({
              to: [st.email],
              subject: `Result published: ${exam.name}`,
              html: `<p>Dear ${st.firstName},</p><p>Your result for <strong>${exam.name}</strong> is now available. Contact <strong>${org?.name ?? "your school"}</strong> for your secure result link.</p>`,
            })
          );
        }
        for (const ph of studentFamilyPhones(st).slice(0, 2)) {
          const digits = normalizeWhatsAppRecipient(ph);
          if (digits) {
            out.push(
              sendNotificationWhatsApp(
                digits,
                `Result published: ${exam.name}. Student: ${st.firstName} ${st.lastName}. Contact school for your secure link.`
              )
            );
          }
        }
        return out;
      })
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}