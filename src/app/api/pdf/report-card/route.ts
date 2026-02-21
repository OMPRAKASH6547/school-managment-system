import { NextRequest, NextResponse } from "next/server";
import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";

// PDF styles - professional report card look
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 11,
    fontFamily: "Helvetica",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: "#dc2626",
  },
  logo: {
    width: 50,
    height: 50,
    marginRight: 15,
    borderRadius: 25,
  },
  schoolName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#0f172a",
  },
  subTitle: {
    fontSize: 10,
    color: "#64748b",
    marginTop: 2,
  },
  studentSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    padding: 12,
    backgroundColor: "#f8fafc",
    borderRadius: 4,
  },
  studentName: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#0f172a",
  },
  studentMeta: {
    fontSize: 10,
    color: "#64748b",
    marginTop: 4,
  },
  examBlock: {
    marginBottom: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 4,
  },
  examTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#dc2626",
    marginBottom: 4,
  },
  examMeta: {
    fontSize: 9,
    color: "#64748b",
    marginBottom: 8,
  },
  table: {
    marginTop: 6,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingVertical: 6,
  },
  tableHead: {
    flexDirection: "row",
    borderBottomWidth: 2,
    borderBottomColor: "#cbd5e1",
    paddingVertical: 6,
    fontWeight: "bold",
  },
  colSubject: { flex: 2 },
  colMarks: { width: 50, textAlign: "right" },
  colMax: { width: 50, textAlign: "right" },
  totalRow: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: "bold",
    color: "#0f172a",
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: "center",
    fontSize: 8,
    color: "#94a3b8",
  },
});

function ReportCardPDF({
  schoolName,
  schoolLogo,
  studentName,
  rollNo,
  className,
  exams,
}: {
  schoolName: string;
  schoolLogo: string | null;
  studentName: string;
  rollNo: string | null;
  className: string | null;
  exams: { name: string; examType: string; academicYear: string | null; subjects: { name: string; maxMarks: number; obtained: number }[] }[];
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          {schoolLogo ? (
            <Image src={schoolLogo.startsWith("/") ? `${process.env.NEXTAUTH_URL || "http://localhost:3000"}${schoolLogo}` : schoolLogo} style={styles.logo} />
          ) : (
            <View style={[styles.logo, { backgroundColor: "#dc2626", justifyContent: "center", alignItems: "center" }]}>
              <Text style={{ color: "white", fontSize: 20, fontWeight: "bold" }}>{schoolName.charAt(0)}</Text>
            </View>
          )}
          <View>
            <Text style={styles.schoolName}>{schoolName}</Text>
            <Text style={styles.subTitle}>Report Card / Score Card</Text>
          </View>
        </View>

        <View style={styles.studentSection}>
          <View>
            <Text style={styles.studentName}>{studentName}</Text>
            <Text style={styles.studentMeta}>
              {rollNo ? `Roll No: ${rollNo}` : ""} {className ? ` · Class: ${className}` : ""}
            </Text>
          </View>
        </View>

        {exams.map((exam) => {
          const totalMax = exam.subjects.reduce((s, sub) => s + sub.maxMarks, 0);
          const totalObtained = exam.subjects.reduce((s, sub) => s + sub.obtained, 0);
          const percent = totalMax > 0 ? Math.round((totalObtained / totalMax) * 100) : 0;
          return (
            <View key={exam.name} style={styles.examBlock} wrap={false}>
              <Text style={styles.examTitle}>{exam.name}</Text>
              <Text style={styles.examMeta}>{exam.examType} {exam.academicYear ? ` · ${exam.academicYear}` : ""}</Text>
              <View style={styles.table}>
                <View style={styles.tableHead}>
                  <Text style={styles.colSubject}>Subject</Text>
                  <Text style={styles.colMarks}>Marks</Text>
                  <Text style={styles.colMax}>Max</Text>
                </View>
                {exam.subjects.map((sub) => (
                  <View key={sub.name} style={styles.tableRow}>
                    <Text style={styles.colSubject}>{sub.name}</Text>
                    <Text style={styles.colMarks}>{sub.obtained}</Text>
                    <Text style={styles.colMax}>{sub.maxMarks}</Text>
                  </View>
                ))}
              </View>
              <Text style={styles.totalRow}>Total: {totalObtained} / {totalMax} ({percent}%)</Text>
            </View>
          );
        })}

        <Text style={styles.footer}>
          {schoolName} · Generated by SchoolSaaS · This is a computer-generated document.
        </Text>
      </Page>
    </Document>
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { schoolName, schoolLogo, studentName, rollNo, className, exams, studentImage } = body;
    if (!schoolName || !studentName || !exams?.length) {
      return NextResponse.json({ error: "Missing data" }, { status: 400 });
    }

    const { renderToBuffer } = await import("@react-pdf/renderer");
    const doc = (
      <ReportCardPDF
        schoolName={schoolName}
        schoolLogo={schoolLogo || null}
        studentName={studentName}
        rollNo={rollNo || null}
        className={className || null}
        exams={exams}
      />
    );
    const buffer = await renderToBuffer(doc);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="report-card.pdf"',
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "PDF generation failed" }, { status: 500 });
  }
}
