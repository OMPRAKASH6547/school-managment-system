import { NextRequest, NextResponse } from "next/server";
import { getSession, requireOrganization, requireBranchAccess, setSelectedBranch } from "@/lib/auth";
import { z } from "zod";
import { requirePermission } from "@/lib/permissions";

const bodySchema = z.object({
  branchId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    requirePermission(session, "branches.select", "write");
    requireOrganization(session);

    const body = bodySchema.parse(await req.json());
    const branchId = requireBranchAccess(session.organizationId!, body.branchId);

    await setSelectedBranch(branchId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.errors[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    if (e instanceof Error && e.message.includes("Unauthorized")) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed to select branch" }, { status: 500 });
  }
}

