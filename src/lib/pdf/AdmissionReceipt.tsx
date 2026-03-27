import React from "react";
import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";

export function createAdmissionReceiptDocument({
  org,
  student,
  payment,
  qrDataUrl,
  createdByName,
}: {
  org: { name: string; logo: string | null; address: string | null; phone: string | null; email: string | null };
  student: {
    firstName: string;
    lastName: string;
    rollNo: string | null;
    aadhaarNo: string | null;
    bloodGroup: string | null;
    dateOfBirth: Date | null;
  };
  payment: {
    id: string;
    amount: number;
    paidAt: Date;
    method: string;
    reference: string | null;
  };
  qrDataUrl: string;
  createdByName: string | null;
}) {
  const styles = StyleSheet.create({
    page: { padding: 28, fontSize: 10, fontFamily: "Helvetica", color: "#0f172a" },
    header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 18 },
    brand: { flexDirection: "row", gap: 10, alignItems: "center" },
    logo: { width: 52, height: 52, borderRadius: 8, border: "1px solid #cbd5e1", objectFit: "cover" },
    schoolName: { fontSize: 16, fontWeight: "bold" },
    receiptTitle: { fontSize: 14, fontWeight: "bold", textAlign: "right" },
    muted: { color: "#64748b" },
    block: { marginBottom: 10 },
    table: { borderWidth: 1, borderColor: "#e2e8f0" },
    row: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#e2e8f0" },
    cell: { flex: 1, padding: 8, borderRightWidth: 1, borderRightColor: "#e2e8f0" },
    cellLast: { flex: 1, padding: 8 },
    key: { color: "#475569", marginBottom: 2 },
    val: { fontWeight: "bold" },
    footer: { marginTop: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
    qr: { width: 92, height: 92 },
  });

  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const logoSrc = org.logo ? `${baseUrl.replace(/\/$/, "")}/${org.logo}` : null;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.brand}>
            {logoSrc ? <Image src={logoSrc} style={styles.logo} /> : null}
            <View>
              <Text style={styles.schoolName}>{org.name}</Text>
              <Text style={styles.muted}>{org.address ?? "-"}</Text>
              <Text style={styles.muted}>Phone: {org.phone ?? "-"}</Text>
              <Text style={styles.muted}>Email: {org.email ?? "-"}</Text>
            </View>
          </View>
          <View>
            <Text style={styles.receiptTitle}>Admission Receipt</Text>
            <Text style={styles.muted}>{payment.id}</Text>
          </View>
        </View>

        <View style={styles.block}>
          <Text style={styles.key}>Student</Text>
          <Text style={styles.val}>
            {student.firstName} {student.lastName}
          </Text>
          <Text style={styles.muted}>Roll No: {student.rollNo ?? "-"}</Text>
          <Text style={styles.muted}>Aadhaar: {student.aadhaarNo ?? "-"}</Text>
          <Text style={styles.muted}>Blood Group: {student.bloodGroup ?? "-"}</Text>
          <Text style={styles.muted}>
            Date of Birth: {student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString() : "-"}
          </Text>
        </View>

        <View style={styles.table}>
          <View style={styles.row}>
            <View style={styles.cell}>
              <Text style={styles.key}>Amount</Text>
              <Text style={styles.val}>INR {payment.amount}</Text>
            </View>
            <View style={styles.cellLast}>
              <Text style={styles.key}>Payment Date</Text>
              <Text style={styles.val}>{new Date(payment.paidAt).toLocaleDateString()}</Text>
            </View>
          </View>
          <View style={styles.row}>
            <View style={styles.cell}>
              <Text style={styles.key}>Payment Method</Text>
              <Text style={styles.val}>{payment.method}</Text>
            </View>
            <View style={styles.cellLast}>
              <Text style={styles.key}>Reference</Text>
              <Text style={styles.val}>{payment.reference ?? "-"}</Text>
            </View>
          </View>
          <View style={styles.row}>
            <View style={styles.cell}>
              <Text style={styles.key}>Created By</Text>
              <Text style={styles.val}>{createdByName ?? "-"}</Text>
            </View>
            <View style={styles.cellLast}>
              <Text style={styles.key}>Purpose</Text>
              <Text style={styles.val}>Student Admission Fee</Text>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <View>
            <Text style={styles.muted}>Scan QR to verify receipt details.</Text>
            <Text style={styles.muted}>This is a system-generated receipt.</Text>
          </View>
          <Image src={qrDataUrl} style={styles.qr} />
        </View>
      </Page>
    </Document>
  );
}

