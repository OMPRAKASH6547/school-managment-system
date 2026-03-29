import React from "react";
import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import {
  CO_SCHOLASTIC_LABELS,
  GRADE_SCALE_ROWS,
  gradeFromFraction,
} from "@/lib/report-card-grade";
import type { PdfThemeColors } from "@/lib/pdf/pdfTheme";
import { DEFAULT_PDF_THEME } from "@/lib/pdf/pdfTheme";

type Subject = {
  name: string;
  marks: number;
  maxMarks: number;
};

type Exam = {
  name: string;
  examType?: string;
  academicYear?: string | null;
  subjects: Subject[];
};

type Props = {
  schoolName: string;
  schoolLogoUrl?: string | null;
  schoolAddress?: string | null;
  branchName?: string | null;
  branchAddress?: string | null;
  affiliationNote?: string | null;
  academicSessionLabel?: string | null;
  studentName: string;
  rollNo?: string | null;
  className?: string | null;
  studentDob?: string | null;
  studentAddress?: string | null;
  fatherName?: string | null;
  motherName?: string | null;
  admissionNo?: string | null;
  house?: string | null;
  studentPhotoUrl?: string | null;
  exams: Exam[];
  qrDataUrl?: string;
  /** When set, tints bars, borders, and table headers (from school settings). */
  pdfTheme?: PdfThemeColors | null;
};

function buildReportCardStyles(theme: PdfThemeColors) {
  const { primary, border, light } = theme;
  return StyleSheet.create({
    page: { padding: 12, fontSize: 7, color: "#0f172a", fontFamily: "Helvetica" },
    outerBorder: { borderWidth: 1.5, borderColor: border, padding: 4, flexGrow: 1 },
    topRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "flex-start", marginBottom: 6 },
    logoBox: { width: 44, height: 44, justifyContent: "center", alignItems: "center" },
    logo: { width: 42, height: 42, objectFit: "contain" },
    logoPlaceholder: { width: 42, height: 42, borderWidth: 0.5, borderColor: border },
    centerBlock: { flex: 1, paddingHorizontal: 8, alignItems: "center" },
    schoolName: {
      fontSize: 13,
      fontFamily: "Helvetica-Bold",
      color: primary,
      textAlign: "center",
      textTransform: "uppercase",
    },
    addressLine: { fontSize: 8, color: primary, textAlign: "center", marginTop: 2 },
    affiliationLine: { fontSize: 7, color: primary, textAlign: "center", marginTop: 1 },
    branchLine: { fontSize: 8, color: "#334155", textAlign: "center", marginTop: 2 },
    sessionBar: { backgroundColor: primary, paddingVertical: 4, marginTop: 4, marginHorizontal: -2 },
    sessionBarText: { color: "#ffffff", fontSize: 9, fontFamily: "Helvetica-Bold", textAlign: "center", textTransform: "uppercase" },
    sectionBar: { backgroundColor: primary, paddingVertical: 4, marginTop: 6 },
    sectionBarText: { color: "#ffffff", fontSize: 8, fontFamily: "Helvetica-Bold", textAlign: "center", textTransform: "uppercase" },
    infoTable: { borderWidth: 1, borderColor: border, marginTop: 4 },
    infoRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: border },
    infoCell: { width: "50%", flexDirection: "row", padding: 4, borderRightWidth: 1, borderRightColor: border },
    infoCellLast: { borderRightWidth: 0 },
    label: { fontFamily: "Helvetica-Bold", color: primary, fontSize: 7, width: "42%" },
    value: { fontSize: 7, flex: 1 },
    table: { borderWidth: 1, borderColor: border, marginTop: 4 },
    thRow: { flexDirection: "row", backgroundColor: light, borderBottomWidth: 1, borderBottomColor: border },
    th: { padding: 3, fontFamily: "Helvetica-Bold", fontSize: 6.5, color: primary, borderRightWidth: 1, borderRightColor: border },
    tr: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: border },
    td: { padding: 3, fontSize: 6.5, borderRightWidth: 1, borderRightColor: border },
    tdLast: { borderRightWidth: 0 },
    smallGrid: { flexDirection: "row", marginTop: 3, gap: 3 },
    smallBox: { flex: 1, borderWidth: 1, borderColor: border },
    remarkBox: { borderWidth: 1, borderColor: border, marginTop: 3, minHeight: 26 },
    sigRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 6, paddingHorizontal: 8 },
    sigLabel: { fontSize: 7, textAlign: "center", width: "30%" },
    instructTitle: { fontFamily: "Helvetica-Bold", color: primary, fontSize: 7, marginTop: 3 },
    gradeTable: { borderWidth: 1, borderColor: border, marginTop: 2 },
    footer: { marginTop: 3, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    qr: { width: 34, height: 34 },
    footerNote: { fontSize: 6, color: "#64748b", maxWidth: 220, paddingRight: 6 },
    studentBlock: { flexDirection: "row", marginTop: 4, borderWidth: 1, borderColor: border, alignItems: "stretch" },
    studentPhotoCol: {
      width: 54,
      borderRightWidth: 1,
      borderRightColor: border,
      padding: 4,
      alignItems: "center",
      justifyContent: "flex-start",
      backgroundColor: "#f8fafc",
    },
    // Padding inside border so Image never overlaps the stroke (fixes “cut” top border in PDF).
    studentPhotoFrame: {
      width: 50,
      height: 50,
      backgroundColor: "#ffffff",
      borderWidth: 1,
      borderColor: border,
      padding: 3,
      alignItems: "center",
      justifyContent: "center",
    },
    studentPhoto: { width: 40, height: 40, objectFit: "contain" as const },
    studentPhotoEmpty: {
      width: 40,
      height: 40,
      backgroundColor: "#e2e8f0",
    },
    studentPhotoCaption: { fontSize: 5, color: "#64748b", marginTop: 3, textAlign: "center" },
    studentInfoCol: { flex: 1 },
    infoTableEmbedded: { marginTop: 0, borderWidth: 0 },
  });
}

function dash(v: string | null | undefined): string {
  const t = v?.trim();
  return t ? t : "—";
}

function academicSessionFromExams(exams: Exam[]): string {
  const years = exams.map((e) => e.academicYear?.trim()).filter(Boolean) as string[];
  if (years.length) return years[0]!;
  const y = new Date().getFullYear();
  return `${y - 1} - ${y}`;
}

/** Older exam = term 1, newer = term 2 (exams ordered newest first). */
function scholasticLayout(exams: Exam[]) {
  if (exams.length === 0) return { kind: "none" as const };
  if (exams.length === 1) return { kind: "single" as const, exam: exams[0]! };
  const term2 = exams[0]!;
  const term1 = exams[1]!;
  const names = Array.from(
    new Set([...term1.subjects.map((s) => s.name), ...term2.subjects.map((s) => s.name)])
  );
  return { kind: "dual" as const, term1, term2, subjectNames: names };
}

const ReportCard: React.FC<Props> = ({
  schoolName,
  schoolLogoUrl,
  schoolAddress,
  branchName,
  branchAddress,
  affiliationNote,
  academicSessionLabel,
  studentName,
  rollNo,
  className,
  studentDob,
  studentAddress,
  fatherName,
  motherName,
  admissionNo,
  house,
  studentPhotoUrl,
  exams,
  qrDataUrl,
  pdfTheme,
}) => {
  const theme = pdfTheme ?? DEFAULT_PDF_THEME;
  const styles = buildReportCardStyles(theme);
  const sessionText = academicSessionLabel?.trim() || academicSessionFromExams(exams);
  const layout = scholasticLayout(exams);

  const LogoOrEmpty = () =>
    schoolLogoUrl ? <Image src={schoolLogoUrl} style={styles.logo} /> : <View style={styles.logoPlaceholder} />;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.outerBorder}>
          {/* Header — single school logo (left) */}
          <View style={styles.topRow}>
            <View style={styles.logoBox}>
              <LogoOrEmpty />
            </View>
            <View style={styles.centerBlock}>
              <Text style={styles.schoolName}>{dash(schoolName)}</Text>
              <Text style={styles.addressLine}>{dash(schoolAddress)}</Text>
              <Text style={styles.affiliationLine}>{dash(affiliationNote)}</Text>
              <Text style={styles.branchLine}>
                {branchName || branchAddress
                  ? [branchName, branchAddress].filter(Boolean).join(" · ")
                  : "—"}
              </Text>
            </View>
          </View>

          <View style={styles.sessionBar}>
            <Text style={styles.sessionBarText}>REPORT CARD FOR ACADEMIC SESSION ({sessionText})</Text>
          </View>

          {/* Student details */}
          <View style={styles.sectionBar}>
            <Text style={styles.sectionBarText}>STUDENT INFORMATION</Text>
          </View>
          <View style={styles.studentBlock}>
            <View style={styles.studentPhotoCol}>
              <View style={styles.studentPhotoFrame}>
                {studentPhotoUrl ? (
                  <Image src={studentPhotoUrl} style={styles.studentPhoto} />
                ) : (
                  <View style={styles.studentPhotoEmpty} />
                )}
              </View>
              <Text style={styles.studentPhotoCaption}>Student photo</Text>
            </View>
            <View style={styles.studentInfoCol}>
              <View style={[styles.infoTable, styles.infoTableEmbedded]}>
            <View style={styles.infoRow}>
              <View style={styles.infoCell}>
                <Text style={styles.label}>STUDENT NAME :</Text>
                <Text style={styles.value}>{dash(studentName)}</Text>
              </View>
              <View style={[styles.infoCell, styles.infoCellLast]}>
                <Text style={styles.label}>CLASS :</Text>
                <Text style={styles.value}>{dash(className)}</Text>
              </View>
            </View>
            <View style={styles.infoRow}>
              <View style={styles.infoCell}>
                <Text style={styles.label}>FATHER&apos;S NAME :</Text>
                <Text style={styles.value}>{dash(fatherName)}</Text>
              </View>
              <View style={[styles.infoCell, styles.infoCellLast]}>
                <Text style={styles.label}>MOTHER&apos;S NAME :</Text>
                <Text style={styles.value}>{dash(motherName)}</Text>
              </View>
            </View>
            <View style={styles.infoRow}>
              <View style={styles.infoCell}>
                <Text style={styles.label}>ADDRESS :</Text>
                <Text style={styles.value}>{dash(studentAddress)}</Text>
              </View>
              <View style={[styles.infoCell, styles.infoCellLast]}>
                <Text style={styles.label}>HOUSE :</Text>
                <Text style={styles.value}>{dash(house)}</Text>
              </View>
            </View>
            <View style={styles.infoRow}>
              <View style={styles.infoCell}>
                <Text style={styles.label}>D.O.B. :</Text>
                <Text style={styles.value}>{dash(studentDob)}</Text>
              </View>
              <View style={[styles.infoCell, styles.infoCellLast]}>
                <Text style={styles.label}>ADMISSION NO. :</Text>
                <Text style={styles.value}>{dash(admissionNo)}</Text>
              </View>
            </View>
            <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
              <View style={[styles.infoCell, { width: "100%", borderRightWidth: 0 }]}>
                <Text style={styles.label}>ROLL NO. :</Text>
                <Text style={styles.value}>{dash(rollNo)}</Text>
              </View>
            </View>
              </View>
            </View>
          </View>

          {/* Scholastic */}
          <View style={styles.sectionBar}>
            <Text style={styles.sectionBarText}>SCHOLASTIC AREAS</Text>
          </View>
          <View style={styles.table}>
            {layout.kind === "none" && (
              <View style={styles.tr}>
                <Text style={[styles.td, { width: "100%", borderRightWidth: 0 }]}>—</Text>
              </View>
            )}
            {layout.kind === "single" && (
              <>
                <View style={styles.thRow}>
                  <Text style={[styles.th, { width: "40%" }]}>SUBJECT</Text>
                  <Text style={[styles.th, { width: "20%", textAlign: "center" }]}>MAX</Text>
                  <Text style={[styles.th, { width: "20%", textAlign: "center" }]}>OBTAINED</Text>
                  <Text style={[styles.th, { width: "20%", textAlign: "center", borderRightWidth: 0 }]}>GRADE</Text>
                </View>
                {layout.exam.subjects.length === 0 ? (
                  <View style={styles.tr}>
                    <Text style={[styles.td, { width: "100%", borderRightWidth: 0 }]}>—</Text>
                  </View>
                ) : (
                  layout.exam.subjects.map((sub, i) => (
                    <View key={i} style={styles.tr}>
                      <Text style={[styles.td, { width: "40%" }]}>{sub.name}</Text>
                      <Text style={[styles.td, { width: "20%", textAlign: "center" }]}>{sub.maxMarks}</Text>
                      <Text style={[styles.td, { width: "20%", textAlign: "center" }]}>{sub.marks}</Text>
                      <Text style={[styles.td, styles.tdLast, { width: "20%", textAlign: "center" }]}>
                        {gradeFromFraction(sub.marks, sub.maxMarks)}
                      </Text>
                    </View>
                  ))
                )}
                {layout.exam.subjects.length > 0 ? (
                  <View style={styles.tr}>
                    <Text style={[styles.td, { width: "40%", fontFamily: "Helvetica-Bold" }]}>{layout.exam.name}</Text>
                    <Text style={[styles.td, { width: "20%", textAlign: "center" }]}>
                      {layout.exam.subjects.reduce((s, x) => s + x.maxMarks, 0)}
                    </Text>
                    <Text style={[styles.td, { width: "20%", textAlign: "center" }]}>
                      {layout.exam.subjects.reduce((s, x) => s + x.marks, 0)}
                    </Text>
                    <Text style={[styles.td, styles.tdLast, { width: "20%", textAlign: "center" }]}>—</Text>
                  </View>
                ) : null}
              </>
            )}
            {layout.kind === "dual" && (
              <>
                <View style={styles.thRow}>
                  <Text style={[styles.th, { width: "28%" }]}>SUBJECT</Text>
                  <Text style={[styles.th, { width: "18%", textAlign: "center" }]}>TERM 1 (OBT.)</Text>
                  <Text style={[styles.th, { width: "12%", textAlign: "center" }]}>MAX</Text>
                  <Text style={[styles.th, { width: "12%", textAlign: "center" }]}>GR.</Text>
                  <Text style={[styles.th, { width: "18%", textAlign: "center" }]}>TERM 2 (OBT.)</Text>
                  <Text style={[styles.th, { width: "12%", textAlign: "center" }]}>MAX</Text>
                  <Text style={[styles.th, styles.tdLast, { width: "12%", textAlign: "center" }]}>GR.</Text>
                </View>
                {layout.subjectNames.map((name, i) => {
                  const s1 = layout.term1.subjects.find((s) => s.name === name);
                  const s2 = layout.term2.subjects.find((s) => s.name === name);
                  return (
                    <View key={i} style={styles.tr}>
                      <Text style={[styles.td, { width: "28%" }]}>{name}</Text>
                      <Text style={[styles.td, { width: "18%", textAlign: "center" }]}>{s1 ? String(s1.marks) : "—"}</Text>
                      <Text style={[styles.td, { width: "12%", textAlign: "center" }]}>{s1 ? String(s1.maxMarks) : "—"}</Text>
                      <Text style={[styles.td, { width: "12%", textAlign: "center" }]}>
                        {s1 ? gradeFromFraction(s1.marks, s1.maxMarks) : "—"}
                      </Text>
                      <Text style={[styles.td, { width: "18%", textAlign: "center" }]}>{s2 ? String(s2.marks) : "—"}</Text>
                      <Text style={[styles.td, { width: "12%", textAlign: "center" }]}>{s2 ? String(s2.maxMarks) : "—"}</Text>
                      <Text style={[styles.td, styles.tdLast, { width: "12%", textAlign: "center" }]}>
                        {s2 ? gradeFromFraction(s2.marks, s2.maxMarks) : "—"}
                      </Text>
                    </View>
                  );
                })}
              </>
            )}
          </View>

          {/* Co-scholastic */}
          <View style={styles.sectionBar}>
            <Text style={styles.sectionBarText}>CO-SCHOLASTIC AREAS</Text>
          </View>
          <View style={styles.table}>
            <View style={styles.thRow}>
              <Text style={[styles.th, { width: "50%" }]}>SUBJECT</Text>
              <Text style={[styles.th, { width: "25%", textAlign: "center" }]}>TERM 1</Text>
              <Text style={[styles.th, styles.tdLast, { width: "25%", textAlign: "center" }]}>TERM 2</Text>
            </View>
            {CO_SCHOLASTIC_LABELS.map((label, i) => (
              <View key={i} style={styles.tr}>
                <Text style={[styles.td, { width: "50%" }]}>{label}</Text>
                <Text style={[styles.td, { width: "25%", textAlign: "center" }]}>—</Text>
                <Text style={[styles.td, styles.tdLast, { width: "25%", textAlign: "center" }]}>—</Text>
              </View>
            ))}
          </View>

          <View style={styles.smallGrid}>
            <View style={styles.smallBox}>
              <View style={{ backgroundColor: theme.light, padding: 2, borderBottomWidth: 1, borderBottomColor: theme.border }}>
                <Text style={{ fontSize: 7, fontFamily: "Helvetica-Bold", color: theme.primary, textAlign: "center" }}>
                  DISCIPLINE
                </Text>
              </View>
              <View style={{ flexDirection: "row" }}>
                <Text style={[styles.td, { flex: 1, textAlign: "center", borderRightWidth: 1 }]}>T1: —</Text>
                <Text style={[styles.td, styles.tdLast, { flex: 1, textAlign: "center" }]}>T2: —</Text>
              </View>
            </View>
            <View style={styles.smallBox}>
              <View style={{ backgroundColor: theme.light, padding: 2, borderBottomWidth: 1, borderBottomColor: theme.border }}>
                <Text style={{ fontSize: 7, fontFamily: "Helvetica-Bold", color: theme.primary, textAlign: "center" }}>
                  ATTENDANCE
                </Text>
              </View>
              <View style={{ flexDirection: "row" }}>
                <Text style={[styles.td, { flex: 1, textAlign: "center", borderRightWidth: 1 }]}>T1: —</Text>
                <Text style={[styles.td, styles.tdLast, { flex: 1, textAlign: "center" }]}>T2: —</Text>
              </View>
            </View>
          </View>

          <View style={styles.sectionBar}>
            <Text style={styles.sectionBarText}>GENERAL REMARK</Text>
          </View>
          <View style={styles.remarkBox}>
            <Text style={{ padding: 4, fontSize: 7 }}>Term 1: —</Text>
            <Text style={{ padding: 4, fontSize: 7 }}>Term 2: —</Text>
          </View>

          <View style={styles.sectionBar}>
            <Text style={styles.sectionBarText}>RESULT</Text>
          </View>
          <View style={[styles.remarkBox, { minHeight: 22 }]}>
            <Text style={{ padding: 4, fontSize: 7 }}>ANNUAL RESULT: —</Text>
            <Text style={{ padding: 4, fontSize: 7 }}>PROMOTION: —</Text>
            <Text style={{ padding: 4, fontSize: 7 }}>Issue date: — · School reopens: —</Text>
          </View>

          <View style={styles.sigRow}>
            <Text style={styles.sigLabel}>CLASS TEACHER</Text>
            <Text style={styles.sigLabel}>PRINCIPAL</Text>
            <Text style={styles.sigLabel}>PARENT</Text>
          </View>

          <Text style={styles.instructTitle}>INSTRUCTIONS</Text>
          <Text style={{ fontSize: 6.5, marginTop: 2 }}>
            Grading is based on marks obtained. Refer to the scale below.
          </Text>
          <View style={styles.gradeTable}>
            <View style={styles.thRow}>
              <Text style={[styles.th, { width: "50%", paddingVertical: 2 }]}>MARKS RANGE</Text>
              <Text style={[styles.th, styles.tdLast, { width: "50%", textAlign: "center", paddingVertical: 2 }]}>GRADE</Text>
            </View>
            {GRADE_SCALE_ROWS.map(([range, g], i) => (
              <View key={i} style={styles.tr}>
                <Text style={[styles.td, { width: "50%", paddingVertical: 2 }]}>{range}</Text>
                <Text style={[styles.td, styles.tdLast, { width: "50%", textAlign: "center", paddingVertical: 2 }]}>{g}</Text>
              </View>
            ))}
          </View>

          {qrDataUrl ? (
            <View style={styles.footer}>
              <Text style={styles.footerNote}>Scan QR to verify this report on the school result page.</Text>
              <Image src={qrDataUrl} style={styles.qr} />
            </View>
          ) : null}
        </View>
      </Page>
    </Document>
  );
};

export default ReportCard;
