import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSelectedBranchId, requireBranchAccess, requireOrganization } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { requirePermission } from "@/lib/permissions";

const bodySchema = z.object({
  date: z.string(),
  entries: z.array(z.object({ staffId: z.string(), status: z.enum(["present", "absent", "late", "leave"]) })),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    requirePermission(session, "staff-attendance", "write");
    requireOrganization(session);
    const orgId = session.organizationId!;
    const branchId = await requireBranchAccess(orgId, await getSelectedBranchId());
    const data = bodySchema.parse(await req.json());
    const date = new Date(data.date);
    date.setHours(0, 0, 0, 0);

    for (const entry of data.entries) {
      const staff = await prisma.staff.findFirst({
        where: { id: entry.staffId, organizationId: orgId, branchId },
        select: { id: true, branchId: true },
      });
      if (!staff) continue;
      await prisma.staffAttendance.upsert({
        where: { staffId_date: { staffId: entry.staffId, date } },
        create: { staffId: entry.staffId, date, status: entry.status, organizationId: orgId, branchId: staff.branchId ?? branchId },
        update: { status: entry.status },
      });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: e.errors[0]?.message }, { status: 400 });
    if (e instanceof Error && e.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
