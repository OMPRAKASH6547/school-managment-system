import React from "react";
import {
    Document,
    Page,
    Text,
    View,
    StyleSheet,
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
    studentName: string;
    rollNo?: string | null;
    className?: string | null;
    exams: Exam[];
};

const styles = StyleSheet.create({
    page: { padding: 30, fontSize: 11 },
    title: { fontSize: 18, marginBottom: 10 },
    section: { marginBottom: 12 },
    row: { flexDirection: "row", justifyContent: "space-between" },
    table: { marginTop: 6 },
});

const ReportCard: React.FC<Props> = ({
    schoolName,
    studentName,
    rollNo,
    className,
    exams,
}) => {
    return (
        <Document>
            <Page size="A4" style={styles.page}>
                <Text style={styles.title}>{schoolName}</Text>

                <View style={styles.section}>
                    <Text>{studentName}</Text>

                    <Text>
                        {rollNo && `Roll No: ${rollNo} `}
                        {className && `Class: ${className}`}
                    </Text>
                </View>

                {exams.map((exam, index) => {
                    const totalMax = exam.subjects.reduce(
                        (s, sub) => s + sub.maxMarks,
                        0
                    );

                    const totalObtained = exam.subjects.reduce(
                        (s, sub) => s + sub.marks,
                        0
                    );

                    const percent = Math.round(
                        (totalObtained / totalMax) * 100
                    );

                    return (
                        <View key={index} style={styles.section}>
                            <Text>{exam.name}</Text>

                            <View style={styles.table}>
                                {exam.subjects.map((sub, i) => (
                                    <View key={i} style={styles.row}>
                                        <Text>{sub.name}</Text>
                                        <Text>
                                            {sub.marks}/{sub.maxMarks}
                                        </Text>
                                    </View>
                                ))}
                            </View>

                            <Text>
                                Total: {totalObtained}/{totalMax} ({percent}%)
                            </Text>
                        </View>
                    );
                })}
            </Page>
        </Document>
    );
};

export default ReportCard;