import { NextResponse } from "next/server";
import { getSession, getSelectedBranchId, requireOrganization, resolveBranchIdForOrganization } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/permissions";
import { notifyEmailAndWhatsApp } from "@/lib/notifications";
import { getSchoolNotifierEmails, studentFamilyPhones } from "@/lib/notification-recipients";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    requirePermission(session, "library", "write");
    requireOrganization(session);
    const orgId = session.organizationId!;
    const branchId = await resolveBranchIdForOrganization(orgId, await getSelectedBranchId());
    const { id } = await params;

    const issue = await prisma.libraryIssue.findFirst({
      // Allow returning legacy issue rows where org/branch may be null.
      where: { id },
      select: { id: true, status: true, returnedAt: true, bookId: true, studentId: true },
    });
    if (!issue) return NextResponse.json({ error: "Issue entry not found" }, { status: 404 });

    const book = await prisma.libraryBook.findFirst({
      where: { id: issue.bookId, organizationId: orgId, branchId },
      select: { id: true, title: true },
    });
    if (!book) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (issue.returnedAt || issue.status === "returned") {
      return NextResponse.json({ error: "Book already returned" }, { status: 400 });
    }

    await prisma.$transaction([
      prisma.libraryIssue.update({
        where: { id: issue.id },
        data: { returnedAt: new Date(), status: "returned" },
      }),
      prisma.libraryBook.update({
        where: { id: issue.bookId },
        data: { availableCopies: { increment: 1 } },
      }),
    ]);

    const student = issue.studentId
      ? await prisma.student.findFirst({
          where: { id: issue.studentId, organizationId: orgId, branchId },
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            motherPhone: true,
            guardianPhone: true,
          },
        })
      : null;
    const [org, adminEmails] = await Promise.all([
      prisma.organization.findUnique({
        where: { id: orgId },
        select: { name: true, email: true, phone: true },
      }),
      getSchoolNotifierEmails(orgId),
    ]);
    const title = book?.title ?? "a book";
    if (student) {
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
        subject: `Library book returned: ${title}`,
        html: `<p><strong>${stuName}</strong> returned <strong>${title}</strong>.</p>`,
      });
    } else {
      void notifyEmailAndWhatsApp({
        emails: [...adminEmails, org?.email].filter(Boolean) as string[],
        phones: org?.phone ? [org.phone] : [],
        subject: `Library book returned: ${title}`,
        html: `<p>A copy of <strong>${title}</strong> was marked returned (no student linked on issue).</p>`,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Error && e.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
