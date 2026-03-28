import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

const DASHBOARD_THEMES = new Set(["slate", "navy", "emerald", "indigo", "rose"]);

function isValidHex6(s: string) {
  return /^#[0-9A-Fa-f]{6}$/.test(s);
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!["school_admin", "admin", "super_admin"].includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const data: { pdfAccentColor?: string | null; dashboardTheme?: string } = {};

  if ("pdfAccentColor" in body) {
    const v = body.pdfAccentColor;
    if (v === null || v === "") {
      data.pdfAccentColor = null;
    } else if (typeof v === "string" && isValidHex6(v.trim())) {
      data.pdfAccentColor = v.trim();
    } else {
      return NextResponse.json({ error: "PDF color must be #RRGGBB or cleared" }, { status: 400 });
    }
  }

  if ("dashboardTheme" in body) {
    const v = body.dashboardTheme;
    if (typeof v !== "string" || !DASHBOARD_THEMES.has(v)) {
      return NextResponse.json({ error: "Invalid dashboard theme" }, { status: 400 });
    }
    data.dashboardTheme = v;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const org = await prisma.organization.update({
    where: { id: session.organizationId },
    data,
    select: { pdfAccentColor: true, dashboardTheme: true },
  });

  return NextResponse.json(org);
}
