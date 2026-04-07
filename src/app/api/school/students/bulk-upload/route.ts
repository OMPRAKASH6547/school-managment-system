import { NextRequest, NextResponse } from "next/server";
import { getSession, getSelectedBranchId, requireOrganization, resolveBranchIdForOrganization } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/permissions";

function parseCsv(text: string): Record<string, string>[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0]!.split(",").map((h) => h.trim());
  const rows: Record<string, string>[] = [];
  for (const line of lines.slice(1)) {
    const cols = line.split(",").map((c) => c.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = cols[i] ?? "";
    });
    rows.push(row);
  }
  return rows;
}

function makeRoll(seed: number): string {
  return `${new Date().getFullYear().toString().slice(-2)}${String(seed).padStart(4, "0")}`;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    requirePermission(session, "students", "write");
    requireOrganization(session);
    const orgId = session.organizationId!;
    const branchId = await resolveBranchIdForOrganization(orgId, await getSelectedBranchId());

    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "CSV file is required" }, { status: 400 });
    const text = await file.text();
    const rows = parseCsv(text);
    if (rows.length === 0) {
      return NextResponse.json(
        { error: "CSV is empty. Required columns: firstName,lastName,rollNo,phone,email,classId,dateOfBirth" },
        { status: 400 }
      );
    }

    const existingCount = await prisma.student.count({ where: { organizationId: orgId, branchId } });
    let created = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]!;
      const firstName = (r.firstName || "").trim();
      const lastName = (r.lastName || "").trim();
      if (!firstName || !lastName) {
        errors.push(`Row ${i + 2}: firstName and lastName are required.`);
        continue;
      }
      const rollNo = (r.rollNo || "").trim() || makeRoll(existingCount + i + 1);
      const classId = (r.classId || "").trim() || null;
      try {
        await prisma.student.create({
          data: {
            organizationId: orgId,
            branchId,
            firstName,
            lastName,
            rollNo,
            phone: (r.phone || "").trim() || null,
            email: (r.email || "").trim().toLowerCase() || null,
            classId,
            dateOfBirth: (r.dateOfBirth || "").trim() ? new Date(r.dateOfBirth) : null,
            gender: (r.gender || "").trim() || null,
            fatherName: (r.fatherName || "").trim() || null,
            motherName: (r.motherName || "").trim() || null,
            guardianPhone: (r.guardianPhone || "").trim() || null,
            address: (r.address || "").trim() || null,
            createdBy: session.id,
            status: "active",
          } as any,
        });
        created += 1;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "failed";
        errors.push(`Row ${i + 2}: ${msg}`);
      }
    }

    return NextResponse.json({
      ok: true,
      created,
      failed: errors.length,
      errors: errors.slice(0, 30),
    });
  } catch (e) {
    if (e instanceof Error && e.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    return NextResponse.json({ error: "Bulk upload failed" }, { status: 500 });
  }
}
