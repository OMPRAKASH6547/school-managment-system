import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import QRCode from "qrcode";
import { generateReportCardBuffer } from "@/lib/pdf/generateReportCard";

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
  schoolName: z.string().min(1),
  schoolLogo: z.string().nullable().optional(),
  studentName: z.string().min(1),
  rollNo: z.string().nullable().optional(),
  className: z.string().nullable().optional(),
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

    const resultUrl = `${baseUrl.replace(/\/$/, "")}/r/${encodeURIComponent(body.slug)}/${encodeURIComponent(
      body.token
    )}`;
    const qrDataUrl = await QRCode.toDataURL(resultUrl);

    const normalizedExams = body.exams.map((exam) => ({
      name: exam.name,
      examType: exam.examType ?? undefined,
      subjects: exam.subjects.map((sub) => ({
        name: sub.name,
        maxMarks: sub.maxMarks,
        marks: sub.obtained,
      })),
    }));

    const pdfBuffer = await generateReportCardBuffer({
      schoolName: body.schoolName,
      studentName: body.studentName,
      rollNo: body.rollNo ?? null,
      className: body.className ?? null,
      exams: normalizedExams,
      qrDataUrl,
      // studentImage intentionally ignored by ReportCard for now
    });

    const studentNameSafe = body.studentName.trim().replace(/\s+/g, "-");
    const receiptDate = new Date().toISOString().slice(0, 10);
    const filename = `${studentNameSafe}_receipt_${receiptDate}.pdf`;

    return new NextResponse(pdfBuffer, {
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