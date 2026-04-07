import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSelectedBranchId, resolveBranchIdForOrganization, requireOrganization } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { requirePermission } from "@/lib/permissions";
import { buildS3ObjectKey, isS3UploadEnabled, uploadBufferToS3 } from "@/lib/s3";

const ALLOWED_IMAGE_EXTS = [".png", ".jpg", ".jpeg", ".webp"] as const;

function normalizeImageExt(fileName: string): string {
  const ext = path.extname(fileName || "").toLowerCase();
  return ALLOWED_IMAGE_EXTS.includes(ext as (typeof ALLOWED_IMAGE_EXTS)[number]) ? ext : ".png";
}

function mimeFromExt(ext: string): string {
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  return "image/png";
}

async function saveImageAndGetUrl(params: {
  orgId: string;
  type: "logo" | "student";
  fileName: string;
  finalName: string;
  body: Buffer;
}): Promise<string> {
  const ext = normalizeImageExt(params.fileName);
  const contentType = mimeFromExt(ext);

  if (isS3UploadEnabled()) {
    const key = buildS3ObjectKey(
      params.type === "logo"
        ? ["uploads", "orgs", params.orgId, params.finalName]
        : ["uploads", "students", params.finalName]
    );
    const out = await uploadBufferToS3({
      key,
      body: params.body,
      contentType,
      cacheControl: "public, max-age=2592000",
    });
    return out.url;
  }

  if (params.type === "logo") {
    const dir = path.join(process.cwd(), "public", "uploads", "orgs", params.orgId);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, params.finalName), params.body);
    return `/uploads/orgs/${params.orgId}/${params.finalName}`;
  }

  const dir = path.join(process.cwd(), "public", "uploads", "students");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, params.finalName), params.body);
  return `/uploads/students/${params.finalName}`;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    requirePermission(session, "upload", "write");
    requireOrganization(session);
    const orgId = session.organizationId!;
    const branchId = await resolveBranchIdForOrganization(orgId, await getSelectedBranchId());

    const formData = await req.formData();
    const type = formData.get("type") as string; // "logo" | "student"
    const file = formData.get("file") as File | null;
    const studentId = formData.get("studentId") as string | null;

    if (!file || !type) {
      return NextResponse.json({ error: "Missing file or type" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const safeExt = normalizeImageExt(file.name);

    if (type === "logo") {
      const filename = `logo${safeExt}`;
      const url = await saveImageAndGetUrl({
        orgId,
        type: "logo",
        fileName: file.name,
        finalName: filename,
        body: buffer,
      });
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
      const filename = `${studentId}${safeExt}`;
      const url = await saveImageAndGetUrl({
        orgId,
        type: "student",
        fileName: file.name,
        finalName: filename,
        body: buffer,
      });
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
