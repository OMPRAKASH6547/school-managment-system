import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSelectedBranchId, resolveBranchIdForOrganization, requireOrganization } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { requirePermission } from "@/lib/permissions";
import { firstZodIssueMessage, LIMITS, zOptionalStr } from "@/lib/field-validation";

const bodySchema = z.object({
  name: z.preprocess(
    (v) => (typeof v === "string" ? v.trim() : v),
    z.string().min(1).max(LIMITS.hostelRoomName),
  ),
  capacity: z.number().int().min(1).max(500),
  floor: zOptionalStr(LIMITS.hostelFloor),
  rent: z.number().min(0).max(1_000_000_000).nullable().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    requirePermission(session, "hostel", "write");
    requireOrganization(session);
    const orgId = session.organizationId!;
    const branchId = await resolveBranchIdForOrganization(orgId, await getSelectedBranchId());
    const data = bodySchema.parse(await req.json());
    await prisma.hostelRoom.create({
      data: {
        organizationId: orgId,
        branchId,
        name: data.name,
        capacity: data.capacity,
        floor: data.floor ?? null,
        rent: data.rent ?? null,
      },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: firstZodIssueMessage(e) }, { status: 400 });
    if (e instanceof Error && e.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
