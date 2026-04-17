"use client";
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { ITenantTransaction } from "@/types";

function sanitize(value: string): string {
	return value.replace(/₦/g, "NGN ");
}

interface ITenantInfo {
	name: string;
	property: string;
	unit: string;
	email: string;
	phone: string;
}

interface IProps {
	transaction: ITenantTransaction;
	tenantInfo: ITenantInfo;
	issuedAt: string;
}

const styles = StyleSheet.create({
	page: {
		fontFamily: "Helvetica",
		fontSize: 10,
		paddingTop: 40,
		paddingBottom: 50,
		paddingHorizontal: 40,
		backgroundColor: "#ffffff",
		color: "#1a202c",
	},

	// Header
	header: {
		marginBottom: 24,
		borderBottomWidth: 2,
		borderBottomColor: "#1E3A5F",
		paddingBottom: 16,
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "flex-end",
	},
	headerLeft: {
		flexDirection: "column",
	},
	appName: {
		fontSize: 22,
		fontFamily: "Helvetica-Bold",
		color: "#1E3A5F",
		letterSpacing: 0.5,
	},
	appTagline: {
		fontSize: 9,
		color: "#718096",
		marginTop: 2,
	},
	headerRight: {
		alignItems: "flex-end",
	},
	receiptTitle: {
		fontSize: 14,
		fontFamily: "Helvetica-Bold",
		color: "#1E3A5F",
		textTransform: "uppercase",
		letterSpacing: 1,
	},
	receiptId: {
		fontSize: 9,
		color: "#718096",
		marginTop: 3,
	},
	issuedDate: {
		fontSize: 9,
		color: "#718096",
		marginTop: 2,
	},

	// Tenant info card
	infoCard: {
		backgroundColor: "#f7fafc",
		borderRadius: 6,
		padding: 14,
		marginBottom: 20,
		flexDirection: "row",
		justifyContent: "space-between",
	},
	infoSection: {
		flexDirection: "column",
		flex: 1,
	},
	infoSectionRight: {
		flexDirection: "column",
		flex: 1,
		alignItems: "flex-end",
	},
	infoLabel: {
		fontSize: 8,
		color: "#718096",
		fontFamily: "Helvetica-Bold",
		textTransform: "uppercase",
		letterSpacing: 0.5,
		marginBottom: 2,
	},
	infoValue: {
		fontSize: 10,
		color: "#1a202c",
		marginBottom: 8,
	},

	// Transaction details table
	tableContainer: {
		marginBottom: 20,
	},
	tableHeader: {
		flexDirection: "row",
		backgroundColor: "#1E3A5F",
		borderRadius: 4,
		paddingVertical: 8,
		paddingHorizontal: 10,
		marginBottom: 2,
	},
	tableHeaderCell: {
		fontSize: 8,
		fontFamily: "Helvetica-Bold",
		color: "#ffffff",
		textTransform: "uppercase",
		letterSpacing: 0.4,
	},
	tableRow: {
		flexDirection: "row",
		paddingVertical: 9,
		paddingHorizontal: 10,
		borderBottomWidth: 1,
		borderBottomColor: "#e2e8f0",
	},
	tableRowAlt: {
		backgroundColor: "#f7fafc",
	},
	tableCell: {
		fontSize: 10,
		color: "#2d3748",
	},

	// Column widths
	colDate: { width: "18%" },
	colType: { width: "15%" },
	colDesc: { width: "32%" },
	colMethod: { width: "18%" },
	colAmount: { width: "17%", alignItems: "flex-end" as const },

	// Amount highlight
	amountCard: {
		backgroundColor: "#1E3A5F",
		borderRadius: 6,
		padding: 16,
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 20,
	},
	amountLabel: {
		fontSize: 11,
		color: "#90cdf4",
		fontFamily: "Helvetica-Bold",
	},
	amountValue: {
		fontSize: 18,
		color: "#ffffff",
		fontFamily: "Helvetica-Bold",
	},
	amountCredit: {
		color: "#68d391",
	},
	amountDebit: {
		color: "#fc8181",
	},
	balanceRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		marginBottom: 16,
		paddingHorizontal: 4,
	},
	balanceLabel: {
		fontSize: 9,
		color: "#718096",
	},
	balanceValue: {
		fontSize: 9,
		color: "#2d3748",
		fontFamily: "Helvetica-Bold",
	},

	// Footer
	footer: {
		position: "absolute",
		bottom: 30,
		left: 40,
		right: 40,
		borderTopWidth: 1,
		borderTopColor: "#e2e8f0",
		paddingTop: 10,
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
	},
	footerText: {
		fontSize: 8,
		color: "#a0aec0",
	},
	footerBrand: {
		fontSize: 8,
		color: "#1E3A5F",
		fontFamily: "Helvetica-Bold",
	},
});

function formatReceiptId(id: string) {
	return `RCP-${id.slice(0, 8).toUpperCase()}`;
}

export default function ReceiptDocument({
	transaction,
	tenantInfo,
	issuedAt,
}: IProps) {
	const {
		date,
		type,
		description,
		paymentMethod,
		amount,
		amountType,
		runningBalance,
	} = transaction;
	const { name, property, unit, email, phone } = tenantInfo;

	return (
		<Document
			title={`Receipt ${formatReceiptId(transaction.id)}`}
			author="PropertyTrack"
			subject="Payment Receipt"
		>
			<Page size="A4" style={styles.page}>
				{/* Header */}
				<View style={styles.header}>
					<View style={styles.headerLeft}>
						<Text style={styles.appName}>PropertyTrack</Text>
						<Text style={styles.appTagline}>
							Property Management System
						</Text>
					</View>
					<View style={styles.headerRight}>
						<Text style={styles.receiptTitle}>Payment Receipt</Text>
						<Text style={styles.receiptId}>
							{formatReceiptId(transaction.id)}
						</Text>
						<Text style={styles.issuedDate}>
							Issued: {issuedAt}
						</Text>
					</View>
				</View>

				{/* Tenant / Property info */}
				<View style={styles.infoCard}>
					<View style={styles.infoSection}>
						<Text style={styles.infoLabel}>Tenant</Text>
						<Text style={styles.infoValue}>{name}</Text>
						<Text style={styles.infoLabel}>Email</Text>
						<Text style={styles.infoValue}>{email}</Text>
					</View>
					<View style={styles.infoSectionRight}>
						<Text style={styles.infoLabel}>Property</Text>
						<Text style={styles.infoValue}>{property}</Text>
						<Text style={styles.infoLabel}>Unit</Text>
						<Text style={styles.infoValue}>{unit}</Text>
						{phone ? (
							<>
								<Text style={styles.infoLabel}>Phone</Text>
								<Text style={styles.infoValue}>{phone}</Text>
							</>
						) : null}
					</View>
				</View>

				{/* Amount highlight */}
				<View style={styles.amountCard}>
					<Text style={styles.amountLabel}>
						{amountType === "credit"
							? "Amount Received"
							: "Amount Charged"}
					</Text>
					<Text
						style={[
							styles.amountValue,
							amountType === "credit"
								? styles.amountCredit
								: styles.amountDebit,
						]}
					>
						{amountType === "debit" ? "-" : "+"}
						{sanitize(amount)}
					</Text>
				</View>

				{/* Transaction detail table */}
				<View style={styles.tableContainer}>
					<View style={styles.tableHeader}>
						<Text style={[styles.tableHeaderCell, styles.colDate]}>
							Date
						</Text>
						<Text style={[styles.tableHeaderCell, styles.colType]}>
							Type
						</Text>
						<Text style={[styles.tableHeaderCell, styles.colDesc]}>
							Description
						</Text>
						<Text
							style={[styles.tableHeaderCell, styles.colMethod]}
						>
							Payment Method
						</Text>
						<Text
							style={[
								styles.tableHeaderCell,
								styles.colAmount,
								{ textAlign: "right" },
							]}
						>
							Amount
						</Text>
					</View>

					<View style={styles.tableRow}>
						<Text style={[styles.tableCell, styles.colDate]}>
							{date}
						</Text>
						<Text style={[styles.tableCell, styles.colType]}>
							{type}
						</Text>
						<Text style={[styles.tableCell, styles.colDesc]}>
							{description}
						</Text>
						<Text style={[styles.tableCell, styles.colMethod]}>
							{paymentMethod}
						</Text>
						<Text
							style={[
								styles.tableCell,
								styles.colAmount,
								{ textAlign: "right" },
								amountType === "credit"
									? { color: "#276749" }
									: { color: "#c53030" },
							]}
						>
							{amountType === "debit" ? "-" : "+"}
							{sanitize(amount)}
						</Text>
					</View>
				</View>

				{/* Running balance */}
				<View style={styles.balanceRow}>
					<Text style={styles.balanceLabel}>
						Running Balance After Transaction
					</Text>
					<Text style={styles.balanceValue}>
						{sanitize(runningBalance)}
					</Text>
				</View>

				{/* Footer */}
				<View style={styles.footer} fixed>
					<Text style={styles.footerText}>
						This is an electronically generated receipt and does not
						require a signature.
					</Text>
					<Text style={styles.footerBrand}>PropertyTrack</Text>
				</View>
			</Page>
		</Document>
	);
}
