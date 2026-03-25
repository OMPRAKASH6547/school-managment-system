import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSelectedBranchId, requireBranchAccess, requireOrganization } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { requirePermission } from "@/lib/permissions";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    requirePermission(session, "upload", "write");
    requireOrganization(session);
    const orgId = session.organizationId!;
    const branchId = await requireBranchAccess(orgId, await getSelectedBranchId());

    const formData = await req.formData();
    const type = formData.get("type") as string; // "logo" | "student"
    const file = formData.get("file") as File | null;
    const studentId = formData.get("studentId") as string | null;

    if (!file || !type) {
      return NextResponse.json({ error: "Missing file or type" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const ext = path.extname(file.name) || ".png";
    const safeExt = [".png", ".jpg", ".jpeg", ".webp"].includes(ext.toLowerCase()) ? ext : ".png";

    if (type === "logo") {
      const dir = path.join(process.cwd(), "public", "uploads", "orgs", orgId);
      await mkdir(dir, { recursive: true });
      const filename = `logo${safeExt}`;
      const filepath = path.join(dir, filename);
      await writeFile(filepath, buffer);
      const url = `/uploads/orgs/${orgId}/${filename}`;
      await prisma.organization.update({
        where: { id: orgId },
        data: { logo: url },
      });
      return NextResponse.json({ url });
    }

    if (type === "student" && studentId) {
      const student = await prisma.student.findFirst({
        where: { id: studentId, organizationId: orgId, branchId },
      });
      if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });
      const dir = path.join(process.cwd(), "public", "uploads", "students");
      await mkdir(dir, { recursive: true });
      const filename = `${studentId}${safeExt}`;
      const filepath = path.join(dir, filename);
      await writeFile(filepath, buffer);
      const url = `/uploads/students/${filename}`;
      await prisma.student.updateMany({
        where: { id: studentId, organizationId: orgId, branchId },
        data: { image: url },
      });
      return NextResponse.json({ url });
    }

    return NextResponse.json({ error: "Invalid type or missing studentId" }, { status: 400 });
  } catch (e) {
    console.error(e);
    if (e instanceof Error && e.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
