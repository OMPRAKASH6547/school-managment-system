import { NextRequest, NextResponse } from "next/server";
import {
  applyBranchCookie,
  assertBranchInOrganization,
  getSession,
  requireOrganization,
} from "@/lib/auth";
import { z } from "zod";
import { requirePermission } from "@/lib/permissions";
import { firstZodIssueMessage, zCuidId } from "@/lib/field-validation";

const bodySchema = z.object({
  branchId: zCuidId,
});

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    requirePermission(session, "branches.select", "write");
    requireOrganization(session);

    const body = bodySchema.parse(await req.json());
    const branchId = await assertBranchInOrganization(session.organizationId!, body.branchId);

    const res = NextResponse.json({ ok: true });
    applyBranchCookie(res, branchId);
    return res;
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: firstZodIssueMessage(e) }, { status: 400 });
    }
    if (e instanceof Error && e.message.includes("Unauthorized")) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed to select branch" }, { status: 500 });
  }
}

