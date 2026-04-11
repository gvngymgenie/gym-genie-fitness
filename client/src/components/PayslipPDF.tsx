import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";

// Register default font (no external font files needed)
Font.register({
  family: "Helvetica",
  fonts: [
    { src: "Helvetica" },
    { src: "Helvetica-Bold" },
    { src: "Helvetica-Oblique" },
  ],
});

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#1a1a1a",
    backgroundColor: "#ffffff",
  },
  header: {
    marginBottom: 24,
    paddingBottom: 16,
    borderBottom: 2,
    borderBottomColor: "#2563eb",
  },
  gymName: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#2563eb",
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 11,
    color: "#6b7280",
    letterSpacing: 2,
  },
  payslipTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1a1a1a",
    marginTop: 8,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottom: 1,
    borderBottomColor: "#e5e7eb",
  },
  infoCol: {
    flexDirection: "column",
    gap: 4,
  },
  infoLabel: {
    fontSize: 8,
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  infoValue: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#1a1a1a",
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#2563eb",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 1,
    fontSize: 9,
    fontWeight: "bold",
    color: "#4b5563",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 1,
    fontSize: 10,
    backgroundColor: "#ffffff",
  },
  tableRowAlt: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 1,
    fontSize: 10,
    backgroundColor: "#f9fafb",
  },
  colDesc: {
    flex: 3,
  },
  colAmount: {
    flex: 1,
    textAlign: "right",
  },
  totalSection: {
    marginTop: 8,
    paddingTop: 8,
    borderTop: 2,
    borderTopColor: "#e5e7eb",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    fontSize: 11,
  },
  grandTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    marginTop: 4,
    paddingTop: 8,
    borderTop: 2,
    borderTopColor: "#2563eb",
    fontSize: 13,
    fontWeight: "bold",
    color: "#059669",
  },
  statusBadge: {
    display: "inline-block",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    fontSize: 9,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  statusPaid: {
    backgroundColor: "#dcfce7",
    color: "#166534",
  },
  statusApproved: {
    backgroundColor: "#dbeafe",
    color: "#1e40af",
  },
  statusDraft: {
    backgroundColor: "#f3f4f6",
    color: "#4b5563",
  },
  footer: {
    marginTop: 32,
    paddingTop: 12,
    borderTop: 1,
    borderTopColor: "#e5e7eb",
  },
  notesLabel: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#6b7280",
    marginBottom: 4,
  },
  notesText: {
    fontSize: 9,
    color: "#4b5563",
    fontStyle: "italic",
  },
  disclaimer: {
    marginTop: 24,
    fontSize: 7,
    color: "#9ca3af",
    textAlign: "center",
  },
  generatedAt: {
    marginTop: 12,
    fontSize: 8,
    color: "#9ca3af",
    textAlign: "right",
  },
});

const formatCurrency = (cents: number): string => {
  return `Rs. ${(cents / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface PayslipData {
  trainerName: string;
  month: number;
  year: number;
  baseSalary: number;
  attendanceDays: number;
  attendanceBonus: number;
  sessionCount: number;
  sessionBonus: number;
  reviewAvgRating: number;
  reviewBonus: number;
  grossPay: number;
  deductions: number;
  netPay: number;
  status: string;
  payDate?: string | null;
  notes?: string | null;
}

interface PayslipPDFProps {
  data: PayslipData;
  gymName?: string;
}

export const PayslipPDF: React.FC<PayslipPDFProps> = ({ data, gymName = "GVN Gym" }) => {
  const {
    trainerName, month, year, baseSalary, attendanceDays, attendanceBonus,
    sessionCount, sessionBonus, reviewAvgRating, reviewBonus,
    grossPay, deductions, netPay, status, payDate, notes,
  } = data;

  const statusStyle = status === "paid" ? styles.statusPaid
    : status === "approved" ? styles.statusApproved
    : styles.statusDraft;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.gymName}>{gymName.toUpperCase()}</Text>
          <Text style={styles.subtitle}>SALARY PAYSLIP</Text>
          <Text style={styles.payslipTitle}>{MONTHS[month - 1]} {year}</Text>
        </View>

        {/* Trainer Info */}
        <View style={styles.infoRow}>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Trainer</Text>
            <Text style={styles.infoValue}>{trainerName}</Text>
          </View>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Period</Text>
            <Text style={styles.infoValue}>{MONTHS[month - 1]} {year}</Text>
          </View>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Status</Text>
            <Text style={[styles.infoValue, styles.statusBadge, statusStyle]}>
              {status.toUpperCase()}
            </Text>
          </View>
          {payDate && (
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>Paid On</Text>
              <Text style={styles.infoValue}>{payDate}</Text>
            </View>
          )}
        </View>

        {/* Earnings Breakdown */}
        <Text style={styles.sectionTitle}>Earnings</Text>

        <View style={styles.tableHeader}>
          <Text style={styles.colDesc}>Description</Text>
          <Text style={styles.colAmount}>Amount</Text>
        </View>

        <View style={styles.tableRow}>
          <Text style={styles.colDesc}>Base Monthly Salary</Text>
          <Text style={styles.colAmount}>{formatCurrency(baseSalary)}</Text>
        </View>

        <View style={styles.tableRowAlt}>
          <Text style={styles.colDesc}>Attendance Bonus ({attendanceDays} days)</Text>
          <Text style={styles.colAmount}>{formatCurrency(attendanceBonus)}</Text>
        </View>

        <View style={styles.tableRow}>
          <Text style={styles.colDesc}>Session Bonus ({sessionCount} sessions completed)</Text>
          <Text style={styles.colAmount}>{formatCurrency(sessionBonus)}</Text>
        </View>

        <View style={styles.tableRowAlt}>
          <Text style={styles.colDesc}>Review Bonus (avg rating: {(reviewAvgRating / 100).toFixed(1)}/5)</Text>
          <Text style={styles.colAmount}>{formatCurrency(reviewBonus)}</Text>
        </View>

        {/* Totals */}
        <View style={styles.totalSection}>
          <View style={styles.totalRow}>
            <Text style={{ fontWeight: "bold" }}>Gross Pay</Text>
            <Text style={{ fontWeight: "bold" }}>{formatCurrency(grossPay)}</Text>
          </View>

          {deductions > 0 && (
            <View style={styles.totalRow}>
              <Text style={{ color: "#dc2626" }}>Deductions</Text>
              <Text style={{ color: "#dc2626" }}>−{formatCurrency(deductions)}</Text>
            </View>
          )}

          <View style={styles.grandTotal}>
            <Text>NET PAYOUT</Text>
            <Text>{formatCurrency(netPay)}</Text>
          </View>
        </View>

        {/* Notes */}
        {notes && (
          <View style={styles.footer}>
            <Text style={styles.notesLabel}>Notes</Text>
            <Text style={styles.notesText}>{notes}</Text>
          </View>
        )}

        {/* Footer */}
        <Text style={styles.disclaimer}>
          This is a computer-generated payslip and does not require a signature.
        </Text>
        <Text style={styles.generatedAt}>
          Generated on {new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
        </Text>
      </Page>
    </Document>
  );
};
