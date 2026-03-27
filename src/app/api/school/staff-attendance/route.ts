import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSelectedBranchId, resolveBranchIdForOrganization, requireOrganization } from "@/lib/auth";
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
    const branchId = await resolveBranchIdForOrganization(orgId, await getSelectedBranchId());
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

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    requirePermission(session, "staff-attendance", "read");
    requireOrganization(session);
    const orgId = session.organizationId!;
    const branchId = await resolveBranchIdForOrganization(orgId, await getSelectedBranchId());

    const dateStr = req.nextUrl.searchParams.get("date");
    const staffId = req.nextUrl.searchParams.get("staffId");
    const month = req.nextUrl.searchParams.get("month");

    if (staffId) {
      const staff = await prisma.staff.findFirst({
        where: { id: staffId, organizationId: orgId, branchId, status: "active" },
        select: { id: true, firstName: true, lastName: true, role: true },
      });
      if (!staff) return NextResponse.json({ error: "Staff not found" }, { status: 404 });

      let start: Date;
      if (month && /^\d{4}-\d{2}$/.test(month)) {
        start = new Date(`${month}-01T00:00:00.000Z`);
      } else {
        const now = new Date();
        start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      }
      const end = new Date(start);
      end.setUTCMonth(start.getUTCMonth() + 1);

      const rows = await prisma.staffAttendance.findMany({
        where: {
          organizationId: orgId,
          branchId,
          staffId,
          date: { gte: start, lt: end },
        },
        orderBy: { date: "asc" },
        select: { date: true, status: true },
      });
      const summary = { present: 0, absent: 0, late: 0, leave: 0 };
      for (const row of rows) {
        if (row.status in summary) summary[row.status as keyof typeof summary] += 1;
      }
      return NextResponse.json({
        staff: { id: staff.id, name: `${staff.firstName} ${staff.lastName}`, role: staff.role },
        month: `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, "0")}`,
        summary,
        records: rows.map((r) => ({ date: r.date.toISOString().slice(0, 10), status: r.status })),
      });
    }

    if (!dateStr) return NextResponse.json({ statuses: {} });
    const start = new Date(dateStr);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 1);

    const rows = await prisma.staffAttendance.findMany({
      where: {
        organizationId: orgId,
        branchId,
        date: { gte: start, lt: end },
      },
      select: { staffId: true, status: true },
    });
    const statuses = Object.fromEntries(rows.map((r) => [r.staffId, r.status]));
    return NextResponse.json({ statuses });
  } catch (e) {
    if (e instanceof Error && e.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed to load staff attendance" }, { status: 500 });
  }
}
