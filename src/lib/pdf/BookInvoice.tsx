import React from "react";
import {
    Document,
    Page,
    View,
    Text,
    Image,
    StyleSheet,
} from "@react-pdf/renderer";

export const createInvoiceDocument = (
    sale: any,
    org: any,
    qrImage: string
) => {
    const styles = StyleSheet.create({
        page: {
            padding: 30,
            fontSize: 10,
            fontFamily: "Helvetica",
        },

        // HEADER
        header: {
            flexDirection: "row",
            justifyContent: "space-between",
            marginBottom: 20,
        },

        logoSection: {
            flexDirection: "row",
            alignItems: "center",
        },

        logo: {
            width: 60,
            height: 60,
            marginRight: 10,
            borderRadius: 10,
            objectFit: "cover",
            border: "1px solid #000",
            padding: 5,
            backgroundColor: "#fff",
            boxShadow: "0 0 10px 0 rgba(0, 0, 0, 0.1)",

        },

        schoolName: {
            fontSize: 16,
            fontWeight: "bold",
        },

        invoiceBox: {
            borderWidth: 1,
            padding: 10,
            width: 200,
        },

        invoiceTitle: {
            fontSize: 14,
            fontWeight: "bold",
            marginBottom: 5,
            textAlign: "center",
        },

        section: {
            marginBottom: 12,
        },

        bold: {
            fontWeight: "bold",
        },

        // TABLE
        table: {
            borderWidth: 1,
            marginTop: 10,
        },

        tableHeader: {
            flexDirection: "row",
            borderBottomWidth: 1,
            backgroundColor: "#f2f2f2",
            paddingVertical: 6,
            paddingHorizontal: 4,
        },

        tableRow: {
            flexDirection: "row",
            borderBottomWidth: 0.5,
            paddingVertical: 5,
            paddingHorizontal: 4,
        },

        col1: { flex: 3 },
        col2: { flex: 1, textAlign: "right" },
        col3: { flex: 1, textAlign: "right" },
        col4: { flex: 1, textAlign: "right" },

        // TOTAL
        totalSection: {
            marginTop: 15,
            alignItems: "flex-end",
        },

        totalRow: {
            flexDirection: "row",
            width: 200,
            justifyContent: "space-between",
            marginBottom: 4,
        },

        grandTotal: {
            fontSize: 12,
            fontWeight: "bold",
        },

        footer: {
            marginTop: 30,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-end",
        },

        qr: {
            width: 90,
            height: 90,
        },

        signature: {
            textAlign: "center",
            marginTop: 40,
            fontSize: 9,
        },
    });

    const subtotal = sale.totalAmount;
    const gst = 0; // Add calculation if needed
    const grandTotal = subtotal + gst;

    const rawItems = Array.isArray(sale.items) ? sale.items : [];
    const hasOnlySyntheticSetItems =
        !!sale.bookSet &&
        rawItems.length > 0 &&
        rawItems.every((it: any) => it?.product?.category === "set_item");

    const printableItems = hasOnlySyntheticSetItems
        ? [
              {
                  id: "set-summary",
                  name: `${sale.bookSet?.name ?? "Book Set"} (Set)`,
                  quantity: rawItems.reduce((sum: number, it: any) => sum + (it.quantity ?? 0), 0),
                  unitPrice: rawItems.length > 0 ? Number((sale.totalAmount / Math.max(1, rawItems.reduce((sum: number, it: any) => sum + (it.quantity ?? 0), 0))).toFixed(2)) : sale.totalAmount,
                  amount: sale.totalAmount,
              },
          ]
        : rawItems.map((it: any) => ({
              id: it.id,
              name: it?.product?.name ?? "Item",
              quantity: it.quantity,
              unitPrice: it.unitPrice,
              amount: it.amount,
          }));

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* HEADER */}
                <View style={styles.header}>
                    <View style={styles.logoSection}>
                        {org.logo && <Image src={process.env.NEXTAUTH_URL + "/" + org.logo} style={styles.logo} />}
                        <View>
                            <Text style={styles.schoolName}>{org.name}</Text>
                            <Text>{org.address || "School Address"}</Text>
                            <Text>Phone: {org.phone || "-"}</Text>
                            <Text>Email: {org.email || "-"}</Text>
                        </View>
                    </View>

                    <View style={styles.invoiceBox}>
                        <Text style={styles.invoiceTitle}>INVOICE</Text>
                        <Text>Invoice No: {sale.invoiceNo ?? sale.id.slice(0, 8)}</Text>
                        <Text>
                            Date: {new Date(sale.soldAt).toLocaleDateString()}
                        </Text>
                    </View>
                </View>

                {/* CUSTOMER DETAILS */}
                <View style={styles.section}>
                    <Text style={styles.bold}>Bill To:</Text>
                    <Text>{sale.customerName || "Walk-in Customer"}</Text>
                    {sale.customerPhone && <Text>{sale.customerPhone}</Text>}
                    {sale.bookSet?.name && <Text>Selected Set: {sale.bookSet.name}</Text>}
                </View>

                {/* TABLE */}
                <View style={styles.table}>
                    <View style={styles.tableHeader}>
                        <Text style={styles.col1}>Item Description</Text>
                        <Text style={styles.col2}>Qty</Text>
                        <Text style={styles.col3}>Price</Text>
                        <Text style={styles.col4}>Amount</Text>
                    </View>

                    {printableItems.map((item: any) => (
                        <View key={item.id} style={styles.tableRow}>
                            <Text style={styles.col1}>{item.name}</Text>
                            <Text style={styles.col2}>{item.quantity}</Text>
                            <Text style={styles.col3}>₹{item.unitPrice}</Text>
                            <Text style={styles.col4}>₹{item.amount}</Text>
                        </View>
                    ))}
                </View>

                {/* TOTAL SECTION */}
                <View style={styles.totalSection}>
                    <View style={styles.totalRow}>
                        <Text>Subtotal:</Text>
                        <Text>₹{subtotal}</Text>
                    </View>

                    <View style={styles.totalRow}>
                        <Text>GST:</Text>
                        <Text>₹{gst}</Text>
                    </View>

                    <View style={styles.totalRow}>
                        <Text style={styles.grandTotal}>Grand Total:</Text>
                        <Text style={styles.grandTotal}>₹{grandTotal}</Text>
                    </View>
                </View>

                {/* FOOTER */}
                <View style={styles.footer}>
                    <View>
                        <Text>Thank you for your business!</Text>
                        <Text style={styles.signature}>
                            ----------------------------{"\n"}
                            Authorized Signature
                        </Text>
                    </View>

                    <Image src={qrImage} style={styles.qr} />
                </View>
            </Page>
        </Document>
    );
};
