import React from "react";
import {
    Document,
    Page,
    Text,
    View,
    StyleSheet,
    Image,
} from "@react-pdf/renderer";

type Subject = {
    name: string;
    marks: number;
    maxMarks: number;
};

type Exam = {
    name: string;
    examType?: string;
    subjects: Subject[];
};

type Props = {
  schoolName: string;
  schoolLogo?: string | null;
  branchName?: string | null;
  studentName: string;
  rollNo?: string | null;
  className?: string | null;
  exams: Exam[];
  qrDataUrl?: string;
};

const styles = StyleSheet.create({
  page: { padding: 24, fontSize: 9, color: "#0f172a" },
  headerBox: { borderWidth: 1, borderColor: "#0f172a", padding: 8, marginBottom: 8 },
  topHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  logo: { width: 44, height: 44, objectFit: "contain" },
  centerHead: { flex: 1, alignItems: "center", paddingHorizontal: 8 },
  boardTitle: { fontSize: 11, fontWeight: 700, textAlign: "center" },
  schoolTitle: { fontSize: 10, textAlign: "center", marginTop: 2 },
  branchTitle: { fontSize: 8.5, textAlign: "center", marginTop: 1, color: "#334155" },
  markSheetTitle: { fontSize: 9, textAlign: "center", marginTop: 3, textTransform: "uppercase" },
  infoGrid: { borderWidth: 1, borderColor: "#334155", marginBottom: 8 },
  infoRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#e2e8f0" },
  infoCell: { width: "50%", padding: 5 },
  section: { marginBottom: 8 },
  examTitle: { fontSize: 9.5, fontWeight: 600, marginBottom: 3 },
  row: { flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: "#e2e8f0" },
  table: { marginTop: 3, borderWidth: 1, borderColor: "#94a3b8" },
  headRow: { flexDirection: "row", backgroundColor: "#e2e8f0", borderBottomWidth: 1, borderBottomColor: "#94a3b8" },
  colSubject: { width: "52%", padding: 4, borderRightWidth: 1, borderRightColor: "#cbd5e1" },
  colNum: { width: "24%", padding: 4, textAlign: "right", borderRightWidth: 1, borderRightColor: "#cbd5e1" },
  colNumLast: { width: "24%", padding: 4, textAlign: "right" },
  totals: { marginTop: 3, fontSize: 9 },
  footer: { marginTop: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  qr: { width: 72, height: 72 },
  footerText: { fontSize: 8, color: "#64748b", maxWidth: 180 },
});

const ReportCard: React.FC<Props> = ({
  schoolName,
  schoolLogo,
  branchName,
  studentName,
  rollNo,
  className,
  exams,
  qrDataUrl,
}) => {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerBox}>
          <View style={styles.topHead}>
            {schoolLogo ? <Image src={schoolLogo} style={styles.logo} /> : <View style={styles.logo} />}
            <View style={styles.centerHead}>
              <Text style={styles.boardTitle}>Bihar School Examination Board (Pattern)</Text>
              <Text style={styles.schoolTitle}>{schoolName}</Text>
              <Text style={styles.branchTitle}>{branchName ?? "-"}</Text>
              <Text style={styles.markSheetTitle}>Statement of Marks</Text>
            </View>
            <View style={styles.logo} />
          </View>
        </View>

        <View style={styles.infoGrid}>
          <View style={styles.infoRow}>
            <View style={styles.infoCell}>
              <Text>Student Name: {studentName}</Text>
            </View>
            <View style={styles.infoCell}>
              <Text>Roll No: {rollNo ?? "-"}</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <View style={styles.infoCell}>
              <Text>Class: {className ?? "-"}</Text>
            </View>
            <View style={styles.infoCell}>
              <Text>Session: {new Date().getFullYear()}</Text>
            </View>
          </View>
        </View>

        {exams.map((exam, index) => {
          const totalMax = exam.subjects.reduce((s, sub) => s + sub.maxMarks, 0);
          const totalObtained = exam.subjects.reduce((s, sub) => s + sub.marks, 0);
          const percent = totalMax > 0 ? Math.round((totalObtained / totalMax) * 100) : 0;

          return (
            <View key={index} style={styles.section}>
              <Text style={styles.examTitle}>{exam.name}</Text>

              <View style={styles.table}>
                <View style={styles.headRow}>
                  <Text style={styles.colSubject}>Subject</Text>
                  <Text style={styles.colNum}>Full Marks</Text>
                  <Text style={styles.colNumLast}>Obtained</Text>
                </View>
                {exam.subjects.map((sub, i) => (
                  <View key={i} style={styles.row}>
                    <Text style={styles.colSubject}>{sub.name}</Text>
                    <Text style={styles.colNum}>{sub.maxMarks}</Text>
                    <Text style={styles.colNumLast}>{sub.marks}</Text>
                  </View>
                ))}
              </View>

              <Text style={styles.totals}>
                Total: {totalObtained}/{totalMax} ({percent}%)
              </Text>
            </View>
          );
        })}

        {qrDataUrl ? (
          <View style={styles.footer}>
            <Text style={styles.footerText}>Scan QR to verify this marksheet.</Text>
            <Image src={qrDataUrl} style={styles.qr} />
          </View>
        ) : null}
      </Page>
    </Document>
  );
};

export default ReportCard;