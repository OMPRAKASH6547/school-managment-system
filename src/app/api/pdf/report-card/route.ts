import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import QRCode from "qrcode";
import { prisma } from "@/lib/db";
import { generateReportCardBuffer } from "@/lib/pdf/generateReportCard";
import { loadImageDataUriForPdf } from "@/lib/pdf/loadImageForPdf";
import { pdfBytesAsResponseBody } from "@/lib/pdf/pdfBytesAsResponseBody";
import { pdfThemeFromAccent } from "@/lib/pdf/pdfTheme";

const subjectSchema = z.object({
  name: z.string(),
  maxMarks: z.number(),
  obtained: z.number(),
});

const examSchema = z.object({
  name: z.string(),
  examType: z.string().optional().nullable(),
  academicYear: z.string().optional().nullable(),
  subjects: z.array(subjectSchema),
});

const bodySchema = z.object({
  slug: z.string().min(1),
  token: z.string().min(1),
  examId: z.string().optional().nullable(),
  schoolName: z.string().min(1),
  schoolLogo: z.string().nullable().optional(),
  schoolAddress: z.string().nullable().optional(),
  branchName: z.string().nullable().optional(),
  branchAddress: z.string().nullable().optional(),
  affiliationNote: z.string().nullable().optional(),
  academicSessionLabel: z.string().nullable().optional(),
  studentName: z.string().min(1),
  rollNo: z.string().nullable().optional(),
  className: z.string().nullable().optional(),
  studentDob: z.string().nullable().optional(),
  studentAddress: z.string().nullable().optional(),
  fatherName: z.string().nullable().optional(),
  motherName: z.string().nullable().optional(),
  admissionNo: z.string().nullable().optional(),
  house: z.string().nullable().optional(),
  exams: z.array(examSchema),
  studentImage: z.string().nullable().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = bodySchema.parse(await req.json());

    const baseUrl =
      process.env.NEXTAUTH_URL ??
      process.env.NEXT_PUBLIC_BASE_URL ??
      "http://localhost:3000";

    const examQs = body.examId ? `?exam=${encodeURIComponent(body.examId)}` : "";
    const resultUrl = `${baseUrl.replace(/\/$/, "")}/r/${encodeURIComponent(body.slug)}/${encodeURIComponent(
      body.token
    )}${examQs}`;
    const qrDataUrl = await QRCode.toDataURL(resultUrl);

    const normalizedExams = body.exams.map((exam) => ({
      name: exam.name,
      examType: exam.examType ?? undefined,
      academicYear: exam.academicYear ?? null,
      subjects: exam.subjects.map((sub) => ({
        name: sub.name,
        maxMarks: sub.maxMarks,
        marks: sub.obtained,
      })),
    }));

    const orgRow = await prisma.organization.findUnique({
      where: { slug: body.slug },
      select: { pdfAccentColor: true },
    });
    const pdfTheme = pdfThemeFromAccent(orgRow?.pdfAccentColor);

    const [schoolLogoUrl, studentPhotoUrl] = await Promise.all([
      loadImageDataUriForPdf(body.schoolLogo),
      loadImageDataUriForPdf(body.studentImage),
    ]);

    const pdfOutputUnknown: unknown = await generateReportCardBuffer({
      schoolName: body.schoolName,
      schoolLogoUrl,
      schoolAddress: body.schoolAddress ?? null,
      branchName: body.branchName ?? null,
      branchAddress: body.branchAddress ?? null,
      affiliationNote: body.affiliationNote ?? null,
      academicSessionLabel: body.academicSessionLabel ?? null,
      studentName: body.studentName,
      rollNo: body.rollNo ?? null,
      className: body.className ?? null,
      studentDob: body.studentDob ?? null,
      studentAddress: body.studentAddress ?? null,
      fatherName: body.fatherName ?? null,
      motherName: body.motherName ?? null,
      admissionNo: body.admissionNo ?? null,
      house: body.house ?? null,
      studentPhotoUrl,
      exams: normalizedExams,
      qrDataUrl,
      pdfTheme,
    });
    const pdfBytes =
      pdfOutputUnknown instanceof Uint8Array
        ? pdfOutputUnknown
        : pdfOutputUnknown instanceof ArrayBuffer
        ? new Uint8Array(pdfOutputUnknown)
        : new Uint8Array(Buffer.from(pdfOutputUnknown as ArrayBuffer));

    const studentNameSafe = body.studentName.trim().replace(/\s+/g, "-");
    const receiptDate = new Date().toISOString().slice(0, 10);
    const filename = `${studentNameSafe}_marksheet_${receiptDate}.pdf`;

    return new NextResponse(pdfBytesAsResponseBody(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.errors[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to generate report card" }, { status: 500 });
  }
}