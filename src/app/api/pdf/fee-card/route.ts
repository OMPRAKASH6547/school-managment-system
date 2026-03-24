export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getSession, requireSchoolAdmin, requireOrganization } from "@/lib/auth";
import { prisma } from "@/lib/db";

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
  const {
    Document,
    Page,
    Text,
    View,
    StyleSheet,
    Image,
  } = await import("@react-pdf/renderer");

  const styles = StyleSheet.create({
    page: { padding: 40, fontSize: 11, fontFamily: "Helvetica" },
    header: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 24,
      paddingBottom: 12,
      borderBottomWidth: 2,
      borderBottomColor: "#dc2626",
    },
    logo: { width: 50, height: 50, marginRight: 15, borderRadius: 25 },
    schoolName: { fontSize: 18, fontWeight: "bold", color: "#0f172a" },
    subTitle: { fontSize: 10, color: "#64748b", marginTop: 2 },
    title: { fontSize: 14, fontWeight: "bold", color: "#dc2626", marginBottom: 16 },
    row: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: 6,
      borderBottomWidth: 1,
      borderBottomColor: "#e2e8f0",
    },
    label: { color: "#64748b" },
    value: { fontWeight: "bold", color: "#0f172a" },
    total: { marginTop: 16, fontSize: 14, fontWeight: "bold", color: "#0f172a" },
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

  return (
    <Document>
    <Page size= "A4" style = { styles.page } >
      <View style={ styles.header }>
        {
          props.schoolLogo ? (
            <Image
              src= {
            props.schoolLogo.startsWith("/")
              ? `${process.env.NEXTAUTH_URL || "http://localhost:3000"}${props.schoolLogo}`
              : props.schoolLogo
          }
              style={ styles.logo }
          />
          ) : (
            <View
              style={
            [
            styles.logo,
            {
              backgroundColor: "#dc2626",
              justifyContent: "center",
              alignItems: "center",
            },
              ]}
          >
          <Text style={{ color: "white", fontSize: 20 }}>
            { props.schoolName.charAt(0) }
            </Text>
            </View>
          )}

<View>
  <Text style={ styles.schoolName }> { props.schoolName } </Text>
    < Text style = { styles.subTitle } > Fee receipt / Fee card </Text>
      </View>
      </View>

      < Text style = { styles.title } > Payment Receipt </Text>

        < View style = { styles.row } >
          <Text style={ styles.label }> Student </Text>
            < Text style = { styles.value } > { props.studentName } </Text>
              </View>

              < View style = { styles.row } >
                <Text style={ styles.label }> Roll No </Text>
                  < Text style = { styles.value } > { props.rollNo ?? "—" } </Text>
                    </View>

                    < View style = { styles.row } >
                      <Text style={ styles.label }> Class </Text>
                        < Text style = { styles.value } > { props.className ?? "—" } </Text>
                          </View>

                          < View style = { styles.row } >
                            <Text style={ styles.label }> Amount(₹) </Text>
                              < Text style = { styles.value } > { props.amount } </Text>
                                </View>

                                < View style = { styles.row } >
                                  <Text style={ styles.label }> Date </Text>
                                    < Text style = { styles.value } >
                                      { new Date(props.paidAt).toLocaleDateString() }
                                      </Text>
                                      </View>

                                      < View style = { styles.row } >
                                        <Text style={ styles.label }> Method </Text>
                                          < Text style = { styles.value } > { props.method } </Text>
                                            </View>

{
  props.reference && (
    <View style={ styles.row }>
      <Text style={ styles.label }> Reference </Text>
        < Text style = { styles.value } > { props.reference } </Text>
          </View>
        )
}

<Text style={ styles.total }> Total Paid: ₹{ props.amount } </Text>

  < Text style = { styles.footer } >
    { props.schoolName } · Computer - generated receipt
      </Text>
      </Page>
      </Document>
  );
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    requireSchoolAdmin(session);
    requireOrganization(session);

    const orgId = session.organizationId!;
    const { paymentId } = await req.json();

    if (!paymentId) {
      return NextResponse.json({ error: "Missing paymentId" }, { status: 400 });
    }

    const payment = await prisma.payment.findFirst({
      where: { id: paymentId, organizationId: orgId },
      include: {
        student: { include: { class: true } },
        organization: true,
      },
    });

    if (!payment?.student) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    if (!payment.verifiedAt) {
      return NextResponse.json(
        { error: "Receipt available only after verification" },
        { status: 403 }
      );
    }

    const doc = await generateFeeCardPDF({
      schoolName: payment.organization!.name,
      schoolLogo: payment.organization!.logo,
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
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="fee-receipt.pdf"',
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "PDF generation failed" }, { status: 500 });
  }
}