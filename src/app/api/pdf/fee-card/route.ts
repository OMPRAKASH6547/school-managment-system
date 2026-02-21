import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { requireSchoolAdmin, requireOrganization } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 11, fontFamily: "Helvetica" },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 24, paddingBottom: 12, borderBottomWidth: 2, borderBottomColor: "#dc2626" },
  logo: { width: 50, height: 50, marginRight: 15, borderRadius: 25 },
  schoolName: { fontSize: 18, fontWeight: "bold", color: "#0f172a" },
  subTitle: { fontSize: 10, color: "#64748b", marginTop: 2 },
  title: { fontSize: 14, fontWeight: "bold", color: "#dc2626", marginBottom: 16 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: "#e2e8f0" },
  label: { color: "#64748b" },
  value: { fontWeight: "bold", color: "#0f172a" },
  total: { marginTop: 16, fontSize: 14, fontWeight: "bold", color: "#0f172a" },
  footer: { position: "absolute", bottom: 30, left: 40, right: 40, textAlign: "center", fontSize: 8, color: "#94a3b8" },
});

async function generateFeeCardPDF(props: {
  schoolName: string;
  schoolLogo: string | null;
  studentName: string;
  rollNo: string | null;
  className: string | null;
  amount: number;
  paidAt: string;
  method: string;
  reference: string | null;
}) {
  const { Document: Doc, Page: P, Text: T, View: V, Image: Img } = await import("@react-pdf/renderer");
  return (
    <Doc>
      <P size="A4" style={styles.page}>
        <V style={styles.header}>
          {props.schoolLogo ? (
            <Img src={props.schoolLogo.startsWith("/") ? `${process.env.NEXTAUTH_URL || "http://localhost:3000"}${props.schoolLogo}` : props.schoolLogo} style={styles.logo} />
          ) : (
            <V style={[styles.logo, { backgroundColor: "#dc2626", justifyContent: "center", alignItems: "center" }]}>
              <T style={{ color: "white", fontSize: 20, fontWeight: "bold" }}>{props.schoolName.charAt(0)}</T>
            </V>
          )}
          <V>
            <T style={styles.schoolName}>{props.schoolName}</T>
            <T style={styles.subTitle}>Fee receipt / Fee card</T>
          </V>
        </V>
        <T style={styles.title}>Payment receipt</T>
        <V style={styles.row}><T style={styles.label}>Student</T><T style={styles.value}>{props.studentName}</T></V>
        <V style={styles.row}><T style={styles.label}>Roll no</T><T style={styles.value}>{props.rollNo ?? "—"}</T></V>
        <V style={styles.row}><T style={styles.label}>Class</T><T style={styles.value}>{props.className ?? "—"}</T></V>
        <V style={styles.row}><T style={styles.label}>Amount (₹)</T><T style={styles.value}>{props.amount}</T></V>
        <V style={styles.row}><T style={styles.label}>Date</T><T style={styles.value}>{new Date(props.paidAt).toLocaleDateString()}</T></V>
        <V style={styles.row}><T style={styles.label}>Method</T><T style={styles.value}>{props.method}</T></V>
        {props.reference && <V style={styles.row}><T style={styles.label}>Reference</T><T style={styles.value}>{props.reference}</T></V>}
        <T style={styles.total}>Total paid: ₹{props.amount}</T>
        <T style={styles.footer}>{props.schoolName} · Computer-generated receipt</T>
      </P>
    </Doc>
  );
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    requireSchoolAdmin(session);
    requireOrganization(session);
    const orgId = session.organizationId!;
    const { paymentId } = await req.json();
    if (!paymentId) return NextResponse.json({ error: "Missing paymentId" }, { status: 400 });
    const payment = await prisma.payment.findFirst({
      where: { id: paymentId, organizationId: orgId },
      include: { student: { include: { class: true } }, organization: true },
    });
    if (!payment?.student) return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    if (!payment.verifiedAt) {
      return NextResponse.json(
        { error: "Fee receipt is only available after the payment is verified by school/coaching admin." },
        { status: 403 }
      );
    }
    const org = payment.organization!;
    const doc = await generateFeeCardPDF({
      schoolName: org.name,
      schoolLogo: org.logo,
      studentName: `${payment.student.firstName} ${payment.student.lastName}`,
      rollNo: payment.student.rollNo,
      className: payment.student.class?.name ?? null,
      amount: payment.amount,
      paidAt: payment.paidAt.toISOString(),
      method: payment.method,
      reference: payment.reference,
    });
    const { renderToBuffer } = await import("@react-pdf/renderer");
    const buffer = await renderToBuffer(doc);
    return new NextResponse(buffer, {
      headers: { "Content-Type": "application/pdf", "Content-Disposition": 'attachment; filename="fee-receipt.pdf"' },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "PDF failed" }, { status: 500 });
  }
}
