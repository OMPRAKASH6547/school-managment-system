import React from "react";
import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";

export function createFeeCardDocument({
  org,
  payer,
  payment,
  qrDataUrl,
  acceptedByName,
}: {
  org: { name: string; logo: string | null; address: string | null; phone: string | null; email: string | null };
  payer: { type: "student" | "staff"; firstName: string; lastName: string; code: string | null };
  payment: {
    id: string;
    payerType: string;
    amount: number;
    paidAt: Date;
    method: string;
    reference: string | null;
    status: string;
    verifiedAt: Date | null;
  };
  qrDataUrl: string;
  acceptedByName: string | null;
}) {
  const styles = StyleSheet.create({
    page: {
      padding: 28,
      fontSize: 10,
      fontFamily: "Helvetica",
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 18,
    },
    logoSection: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    logo: {
      width: 52,
      height: 52,
      borderRadius: 10,
      objectFit: "cover",
      border: "1px solid #000",
      backgroundColor: "#fff",
      padding: 4,
    },
    schoolName: {
      fontSize: 16,
      fontWeight: "bold",
    },
    section: {
      marginBottom: 12,
    },
    label: {
      color: "#334155",
      marginBottom: 2,
    },
    value: {
      color: "#0f172a",
      fontWeight: "bold",
    },
    table: {
      borderWidth: 1,
      borderColor: "#e2e8f0",
    },
    row: {
      flexDirection: "row",
      borderBottomWidth: 1,
      borderBottomColor: "#e2e8f0",
    },
    cell: {
      padding: 8,
      borderRightWidth: 1,
      borderRightColor: "#e2e8f0",
      flexGrow: 1,
    },
    cellLast: {
      padding: 8,
      flexGrow: 1,
    },
    cellKey: {
      color: "#334155",
    },
    footer: {
      marginTop: 18,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-end",
    },
    qr: {
      width: 90,
      height: 90,
    },
    accepted: {
      textAlign: "left",
      fontSize: 9,
      color: "#334155",
    },
    receiptTitle: {
      fontSize: 14,
      fontWeight: "bold",
      textAlign: "center",
    },
    muted: {
      color: "#64748b",
    },
  });

  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const logoSrc = org.logo ? `${baseUrl.replace(/\/$/, "")}/${org.logo}` : null;
  const paidDate = payment.paidAt ? new Date(payment.paidAt) : new Date();
  const verifiedDate = payment.verifiedAt ? new Date(payment.verifiedAt) : null;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.logoSection}>
            {logoSrc ? <Image src={logoSrc} style={styles.logo} /> : null}
            <View>
              <Text style={styles.schoolName}>{org.name}</Text>
              <Text style={styles.muted}>{org.address ?? "-"}</Text>
              <Text style={styles.muted}>Phone: {org.phone ?? "-"}</Text>
              <Text style={styles.muted}>Email: {org.email ?? "-"}</Text>
            </View>
          </View>

          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.receiptTitle}>Fee Receipt</Text>
            <Text style={styles.muted}>{payment.id}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Receipt for</Text>
          <Text style={styles.value}>
            {payer.firstName} {payer.lastName}
          </Text>
          <Text style={styles.muted}>{payer.type === "student" ? "Roll No" : "Employee ID"}: {payer.code ?? "-"}</Text>
        </View>

        <View style={styles.table}>
          <View style={styles.row}>
            <View style={styles.cell}>
              <Text style={styles.cellKey}>Amount</Text>
              <Text style={styles.value}>₹{payment.amount}</Text>
            </View>
            <View style={styles.cellLast}>
              <Text style={styles.cellKey}>Payment Date</Text>
              <Text style={styles.value}>{paidDate.toLocaleDateString()}</Text>
            </View>
          </View>
          <View style={styles.row}>
            <View style={styles.cell}>
              <Text style={styles.cellKey}>Method</Text>
              <Text style={styles.value}>{payment.method}</Text>
            </View>
            <View style={styles.cellLast}>
              <Text style={styles.cellKey}>Reference</Text>
              <Text style={styles.value}>{payment.reference ?? "-"}</Text>
            </View>
          </View>
          <View style={styles.row}>
            <View style={styles.cell}>
              <Text style={styles.cellKey}>Status</Text>
              <Text style={styles.value}>{payment.status}</Text>
            </View>
            <View style={styles.cellLast}>
              <Text style={styles.cellKey}>Verified At</Text>
              <Text style={styles.value}>{verifiedDate ? verifiedDate.toLocaleDateString() : "-"}</Text>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <View style={styles.accepted}>
            <Text>Accepted By: {acceptedByName ?? "-"}</Text>
            <Text style={{ marginTop: 6 }}>Scan QR to verify payment details.</Text>
          </View>
          <Image src={qrDataUrl} style={styles.qr} />
        </View>
      </Page>
    </Document>
  );
}

