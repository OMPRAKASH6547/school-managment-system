"use client";

import { useState } from "react";

type ExamData = {
  name: string;
  examType: string;
  academicYear: string | null;
  subjects: { name: string; maxMarks: number; obtained: number }[];
};

export function ReportCardDownload({
  slug,
  token,
  schoolName,
  schoolLogo,
  studentName,
  rollNo,
  className,
  exams,
  studentImage,
}: {
  slug: string;
  token: string;
  schoolName: string;
  schoolLogo: string | null;
  studentName: string;
  rollNo: string | null;
  className: string | null;
  exams: ExamData[];
  studentImage: string | null;
}) {
  const [loading, setLoading] = useState(false);

  async function handleDownload() {
    setLoading(true);
    try {
      const res = await fetch("/api/pdf/report-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolName,
          schoolLogo,
          studentName,
          rollNo,
          className,
          exams,
          studentImage,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Report-Card-${studentName.replace(/\s+/g, "-")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Download failed. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={loading || exams.length === 0}
      className="rounded-lg bg-school-green px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
    >
      {loading ? "Generating PDF..." : "Download score card (PDF)"}
    </button>
  );
}
