import { NextRequest, NextResponse } from "next/server";
import { getSession, getSelectedBranchId, resolveBranchIdForOrganization, requireOrganization } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/permissions";

/** GET ?rollNo= — find student in current branch for book sale / forms. */
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    requirePermission(session, "books", "read");
    requireOrganization(session);
    const orgId = session.organizationId!;
    const branchId = await resolveBranchIdForOrganization(orgId, await getSelectedBranchId());

    const rollNo = req.nextUrl.searchParams.get("rollNo")?.trim();
    if (!rollNo) {
      return NextResponse.json({ error: "rollNo required" }, { status: 400 });
    }

    const student = await prisma.student.findFirst({
      where: {
        organizationId: orgId,
        branchId,
        rollNo,
        status: "active",
      },
      include: {
        class: { select: { id: true, name: true, section: true } },
      },
    });

    if (!student) {
      return NextResponse.json({ error: "No student found with this roll number" }, { status: 404 });
    }

    return NextResponse.json({
      student: {
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        rollNo: student.rollNo,
        phone: student.phone,
        guardianPhone: student.guardianPhone,
        class: student.class
          ? { name: student.class.name, section: student.class.section }
          : null,
      },
    });
  } catch (e) {
    if (e instanceof Error && e.message.includes("Unauthorized")) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
