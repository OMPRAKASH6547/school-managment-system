import React from "react";
import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import type { PdfThemeColors } from "@/lib/pdf/pdfTheme";
import { DEFAULT_PDF_THEME } from "@/lib/pdf/pdfTheme";

export function createFeeCardDocument({
  org,
  logoDataUri,
  pdfTheme,
  payer,
  payment,
  qrDataUrl,
  verifiedByName,
  issuedByName,
}: {
  org: { name: string; logo: string | null; address: string | null; phone: string | null; email: string | null };
  /** Resolved data URI for PDF (local /uploads/ or remote). */
  logoDataUri?: string | null;
  pdfTheme?: PdfThemeColors | null;
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
    feePeriodMonth?: string | null;
    /** Fee breakdown; falls back to single total if empty. */
    lineItems: { label: string; amount: number }[];
  };
  qrDataUrl: string;
  /** User who verified the payment (from record). */
  verifiedByName: string | null;
  /** Logged-in user generating this PDF (school portal). */
  issuedByName: string | null;
}) {
  const theme = pdfTheme ?? DEFAULT_PDF_THEME;
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
      objectFit: "contain",
      borderWidth: 1,
      borderColor: theme.border,
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
      borderColor: theme.border,
    },
    row: {
      flexDirection: "row",
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    cell: {
      padding: 8,
      borderRightWidth: 1,
      borderRightColor: theme.border,
      flexGrow: 1,
    },
    cellLast: {
      padding: 8,
      flexGrow: 1,
    },
    cellKey: {
      color: "#334155",
    },
    particularsHeader: {
      flexDirection: "row",
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      backgroundColor: theme.light,
      paddingVertical: 6,
      paddingHorizontal: 8,
    },
    particularsHeaderText: {
      fontFamily: "Helvetica-Bold",
      fontSize: 9,
      color: theme.primary,
    },
    particularsRow: {
      flexDirection: "row",
      paddingVertical: 5,
      paddingHorizontal: 8,
      borderBottomWidth: 0.5,
      borderBottomColor: theme.border,
    },
    particularsLabel: { flex: 2, fontSize: 9, color: "#0f172a" },
    particularsAmt: { flex: 1, fontSize: 9, textAlign: "right", color: "#0f172a" },
    totalRow: {
      flexDirection: "row",
      paddingVertical: 8,
      paddingHorizontal: 8,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    totalLabel: { flex: 2, fontFamily: "Helvetica-Bold", fontSize: 10, color: theme.primary },
    totalAmt: { flex: 1, fontFamily: "Helvetica-Bold", fontSize: 10, textAlign: "right", color: theme.primary },
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
      color: theme.primary,
    },
    muted: {
      color: "#64748b",
    },
  });

  const paidDate = payment.paidAt ? new Date(payment.paidAt) : new Date();
  const verifiedDate = payment.verifiedAt ? new Date(payment.verifiedAt) : null;
  const lines =
    payment.lineItems && payment.lineItems.length > 0
      ? payment.lineItems
      : [{ label: "Payment", amount: payment.amount }];
  const lineSum = lines.reduce((s, l) => s + l.amount, 0);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.logoSection}>
            {logoDataUri ? <Image src={logoDataUri} style={styles.logo} /> : null}
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
          {payment.feePeriodMonth ? (
            <Text style={[styles.muted, { marginTop: 4 }]}>Fee month: {payment.feePeriodMonth}</Text>
          ) : null}
        </View>

        <View style={styles.table}>
          <View style={styles.particularsHeader}>
            <Text style={[styles.particularsHeaderText, { flex: 2 }]}>Particulars</Text>
            <Text style={[styles.particularsHeaderText, { flex: 1, textAlign: "right" }]}>Amount (₹)</Text>
          </View>
          {lines.map((line, i) => (
            <View key={i} style={styles.particularsRow}>
              <Text style={styles.particularsLabel}>{line.label}</Text>
              <Text style={styles.particularsAmt}>₹{Number(line.amount).toFixed(2)}</Text>
            </View>
          ))}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalAmt}>₹{lineSum.toFixed(2)}</Text>
          </View>
        </View>

        <View style={[styles.table, { marginTop: 10 }]}>
          <View style={styles.row}>
            <View style={styles.cell}>
              <Text style={styles.cellKey}>Payment Date</Text>
              <Text style={styles.value}>{paidDate.toLocaleDateString()}</Text>
            </View>
            <View style={styles.cellLast}>
              <Text style={styles.cellKey}>Method</Text>
              <Text style={styles.value}>{payment.method}</Text>
            </View>
          </View>
          <View style={styles.row}>
            <View style={styles.cell}>
              <Text style={styles.cellKey}>Reference</Text>
              <Text style={styles.value}>{payment.reference ?? "-"}</Text>
            </View>
            <View style={styles.cellLast}>
              <Text style={styles.cellKey}>Status</Text>
              <Text style={styles.value}>{payment.status}</Text>
            </View>
          </View>
          <View style={{ flexDirection: "row", borderBottomWidth: 1, borderBottomColor: theme.border }}>
            <View style={{ padding: 8, flexGrow: 1 }}>
              <Text style={styles.cellKey}>Verified At</Text>
              <Text style={styles.value}>{verifiedDate ? verifiedDate.toLocaleDateString() : "-"}</Text>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <View style={styles.accepted}>
            <Text>Verified by: {verifiedByName ?? "—"}</Text>
            <Text style={{ marginTop: 4 }}>Issued by: {issuedByName ?? "—"}</Text>
            <Text style={{ marginTop: 6 }}>Scan QR to verify payment details.</Text>
          </View>
          <Image src={qrDataUrl} style={styles.qr} />
        </View>
      </Page>
    </Document>
  );
}

