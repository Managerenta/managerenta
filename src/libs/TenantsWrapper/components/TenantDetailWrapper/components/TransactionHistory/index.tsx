"use client";
import { memo, useCallback, useMemo, useState } from "react";
import {
	FiDownload,
	FiEye,
	FiHome,
	FiMail,
	FiMessageSquare,
	FiShare2,
	FiTool,
	FiZap,
} from "react-icons/fi";
import { toast } from "react-toastify";
import { Box, Button, Input, Text } from "@/components";
import type { ITenantTransaction } from "@/types";
import { downloadReceipt } from "./downloadReceipt";
import { TransactionHistoryStyled } from "./styled";

interface ITenantInfo {
	name: string;
	property: string;
	unit: string;
	email: string;
	phone: string;
}

interface IProps {
	transactions: ITenantTransaction[];
	totals: {
		totalReceived: string;
		totalExpenses: string;
		netBalance: string;
	};
	tenantInfo: ITenantInfo;
}

function getTypeIcon(type: string) {
	switch (type) {
		case "Rent":
			return <FiHome size={14} />;
		case "Maintenance":
			return <FiTool size={14} />;
		default:
			return <FiZap size={14} />;
	}
}

function parseDate(input: string): Date | null {
	// expects DD/MM/YYYY
	const [d, m, y] = input.split("/");
	const date = new Date(Number(y), Number(m) - 1, Number(d));
	return Number.isNaN(date.getTime()) ? null : date;
}

function exportCsv(rows: ITenantTransaction[], tenantName: string): void {
	const escapeCell = (cell: string) => {
		const needs = /[",\n]/.test(cell);
		const out = cell.replace(/"/g, '""');
		return needs ? `"${out}"` : out;
	};
	const header = [
		"Date",
		"Type",
		"Description",
		"Payment Method",
		"Amount",
		"Direction",
		"Running Balance",
	];
	const body = rows.map((t) => [
		t.date,
		t.type,
		t.description,
		t.paymentMethod,
		t.amount,
		t.amountType,
		t.runningBalance,
	]);
	const csv = [header, ...body]
		.map((r) => r.map(escapeCell).join(","))
		.join("\n");
	const blob = new Blob([`﻿${csv}`], {
		type: "text/csv;charset=utf-8;",
	});
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	const safe = tenantName.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
	a.download = `${safe || "tenant"}-transactions.csv`;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}

function ShareMenu({
	transaction,
	tenantInfo,
}: {
	transaction: ITenantTransaction;
	tenantInfo: ITenantInfo;
}) {
	const [open, setOpen] = useState(false);
	const [isDownloading, setIsDownloading] = useState(false);

	const handleDownload = useCallback(async () => {
		setIsDownloading(true);
		setOpen(false);
		try {
			await downloadReceipt(transaction, tenantInfo);
		} catch {
			toast.error("Failed to generate receipt");
		} finally {
			setIsDownloading(false);
		}
	}, [transaction, tenantInfo]);

	const handleEmailShare = useCallback(() => {
		setOpen(false);
		const subject = encodeURIComponent(
			`Receipt for ${transaction.type} on ${transaction.date}`,
		);
		const body = encodeURIComponent(
			`Hello ${tenantInfo.name},\n\nAttached is a copy of your receipt.\n\nProperty: ${tenantInfo.property}\nUnit: ${tenantInfo.unit}\nAmount: ${transaction.amount}\nDate: ${transaction.date}\nMethod: ${transaction.paymentMethod}\n\nThank you.`,
		);
		const href = `mailto:${encodeURIComponent(
			tenantInfo.email,
		)}?subject=${subject}&body=${body}`;
		window.open(href, "_blank", "noopener,noreferrer");
	}, [transaction, tenantInfo]);

	const handleWhatsAppShare = useCallback(() => {
		setOpen(false);
		const text = encodeURIComponent(
			`Hi ${tenantInfo.name}, here are the details for your recent ${transaction.type} on ${transaction.date}: ${transaction.amount} (${transaction.paymentMethod}). — ${tenantInfo.property}, ${tenantInfo.unit}.`,
		);
		const phoneDigits = tenantInfo.phone.replace(/\D/g, "");
		const base = phoneDigits
			? `https://wa.me/${phoneDigits}`
			: "https://wa.me/";
		window.open(`${base}?text=${text}`, "_blank", "noopener,noreferrer");
	}, [transaction, tenantInfo]);

	return (
		<Box className="share-menu-wrapper">
			<FiDownload
				size={16}
				className={`action-icon download-icon ${
					isDownloading ? "loading" : ""
				}`}
				title="Download receipt"
				onClick={handleDownload}
			/>
			<Box className="share-trigger-wrapper">
				<FiShare2
					size={16}
					className="action-icon"
					title="Share receipt"
					onClick={() => setOpen((p) => !p)}
				/>
				{open && (
					<Box className="share-dropdown">
						<Box
							className="share-option"
							onClick={handleEmailShare}
						>
							<FiMail size={14} />
							<span>Send via Email</span>
						</Box>
						<Box
							className="share-option"
							onClick={handleWhatsAppShare}
						>
							<FiMessageSquare size={14} />
							<span>Send via WhatsApp</span>
						</Box>
					</Box>
				)}
			</Box>
		</Box>
	);
}

function TransactionHistory({ transactions, totals, tenantInfo }: IProps) {
	const { totalReceived, totalExpenses, netBalance } = totals;
	const [typeFilter, setTypeFilter] = useState<
		"all" | "rent" | "maintenance" | "utilities" | "other"
	>("all");
	const [range, setRange] = useState<"3months" | "6months" | "1year" | "all">(
		"3months",
	);
	const [search, setSearch] = useState("");
	const [preview, setPreview] = useState<ITenantTransaction | null>(null);

	const filtered = useMemo<ITenantTransaction[]>(() => {
		let result = transactions;
		if (typeFilter !== "all") {
			result = result.filter((t) => t.type.toLowerCase() === typeFilter);
		}
		if (range !== "all") {
			const months =
				range === "3months" ? 3 : range === "6months" ? 6 : 12;
			const cutoff = new Date();
			cutoff.setMonth(cutoff.getMonth() - months);
			result = result.filter((t) => {
				const d = parseDate(t.date);
				return d ? d >= cutoff : true;
			});
		}
		const q = search.trim().toLowerCase();
		if (q) {
			result = result.filter(
				(t) =>
					t.description.toLowerCase().includes(q) ||
					t.paymentMethod.toLowerCase().includes(q) ||
					t.amount.toLowerCase().includes(q),
			);
		}
		return result;
	}, [transactions, typeFilter, range, search]);

	const handleExportAll = useCallback(() => {
		if (filtered.length === 0) {
			toast.info("Nothing to export under current filters");
			return;
		}
		exportCsv(filtered, tenantInfo.name);
		toast.success("Exported");
	}, [filtered, tenantInfo.name]);

	const renderedRows = useMemo(
		() =>
			filtered.map((txn) => (
				<tr key={txn.id}>
					<td className="cell-date">{txn.date}</td>
					<td className="cell-type">
						<Box className="type-cell">
							{getTypeIcon(txn.type)}
							<Text>{txn.type}</Text>
						</Box>
					</td>
					<td className="cell-desc">{txn.description}</td>
					<td className="cell-method">{txn.paymentMethod}</td>
					<td className={`cell-amount ${txn.amountType}`}>
						{txn.amountType === "debit" ? "-" : "+"}
						{txn.amount}
					</td>
					<td className="cell-balance">{txn.runningBalance}</td>
					<td className="cell-actions">
						<Box className="actions-row">
							<FiEye
								size={16}
								className="action-icon"
								title="View"
								onClick={() => setPreview(txn)}
							/>
							<ShareMenu
								transaction={txn}
								tenantInfo={tenantInfo}
							/>
						</Box>
					</td>
				</tr>
			)),
		[filtered, tenantInfo],
	);

	const renderedMobileCards = useMemo(
		() =>
			filtered.map((txn) => (
				<Box key={txn.id} className="transaction-card">
					<Box className={`txn-icon ${txn.amountType}`}>
						{getTypeIcon(txn.type)}
					</Box>
					<Box className="txn-content">
						<Text className="txn-description">
							{txn.description}
						</Text>
						<Text className="txn-meta">
							{txn.date} • {txn.paymentMethod}
						</Text>
					</Box>
					<Box className="txn-amounts">
						<Text className={`txn-amount ${txn.amountType}`}>
							{txn.amountType === "debit" ? "" : "+"}
							{txn.amount}
						</Text>
						<Text className="txn-balance">
							Balance: {txn.runningBalance}
						</Text>
					</Box>
					<Box className="txn-card-actions">
						<ShareMenu transaction={txn} tenantInfo={tenantInfo} />
					</Box>
				</Box>
			)),
		[filtered, tenantInfo],
	);

	return (
		<TransactionHistoryStyled>
			<Text className="section-title">Transaction History</Text>

			<Box className="filters-row">
				<select
					className="filter-select"
					value={typeFilter}
					onChange={(e) =>
						setTypeFilter(
							e.target.value as
								| "all"
								| "rent"
								| "maintenance"
								| "utilities"
								| "other",
						)
					}
				>
					<option value="all">All Transactions</option>
					<option value="rent">Rent</option>
					<option value="maintenance">Maintenance</option>
					<option value="utilities">Utilities</option>
					<option value="other">Other</option>
				</select>

				<select
					className="filter-select"
					value={range}
					onChange={(e) =>
						setRange(
							e.target.value as
								| "3months"
								| "6months"
								| "1year"
								| "all",
						)
					}
				>
					<option value="3months">Last 3 Months</option>
					<option value="6months">Last 6 Months</option>
					<option value="1year">Last Year</option>
					<option value="all">All time</option>
				</select>

				<Box className="search-input">
					<Input
						type="text"
						placeholder="Search transactions..."
						value={search}
						onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
							setSearch(e.target.value)
						}
					/>
				</Box>

				<Box className="export-btn">
					<Button
						type="button"
						title={
							<Box
								style={{
									display: "flex",
									alignItems: "center",
									gap: "6px",
								}}
							>
								<FiDownload size={14} />
								<span>Export All</span>
							</Box>
						}
						background="var(--Surface-Card)"
						color="var(--Main-Blue)"
						border="1px solid var(--Border-Subtle)"
						borderRadius="8px"
						handleClick={handleExportAll}
					/>
				</Box>
			</Box>

			<Box className="table-container">
				<table>
					<thead>
						<tr>
							<th>Date</th>
							<th>Type</th>
							<th>Description</th>
							<th>Payment Method</th>
							<th>Amount</th>
							<th>Running Balance</th>
							<th>Actions</th>
						</tr>
					</thead>
					<tbody>{renderedRows}</tbody>
				</table>
			</Box>

			<Box className="mobile-transactions">{renderedMobileCards}</Box>

			<Box className="totals-row">
				<Box className="total-item">
					<Text className="total-label">Total Rent Paid</Text>
					<Text className="total-value green">{totalReceived}</Text>
				</Box>
				<Box className="total-item">
					<Text className="total-label">Rent Charged</Text>
					<Text className="total-value">{totalExpenses}</Text>
				</Box>
				<Box className="total-item">
					<Text className="total-label">Rent Net Balance</Text>
					<Text className="total-value green bold">{netBalance}</Text>
				</Box>
			</Box>

			{preview && (
				<Box
					className="preview-overlay"
					onClick={() => setPreview(null)}
				>
					<Box
						className="preview-modal"
						onClick={(e) => e.stopPropagation()}
					>
						<Text className="preview-title">
							Transaction details
						</Text>
						<Box className="preview-grid">
							<Text>Date</Text>
							<Text>{preview.date}</Text>
							<Text>Type</Text>
							<Text>{preview.type}</Text>
							<Text>Description</Text>
							<Text>{preview.description}</Text>
							<Text>Payment method</Text>
							<Text>{preview.paymentMethod}</Text>
							<Text>Amount</Text>
							<Text>
								{preview.amountType === "debit" ? "-" : "+"}
								{preview.amount}
							</Text>
							<Text>Running balance</Text>
							<Text>{preview.runningBalance}</Text>
						</Box>
						<Box className="preview-close">
							<Button
								type="button"
								title="Close"
								handleClick={() => setPreview(null)}
								background="var(--Surface-Card)"
								color="var(--Black)"
								border="1px solid var(--Border-Subtle)"
								borderRadius="8px"
							/>
						</Box>
					</Box>
				</Box>
			)}
		</TransactionHistoryStyled>
	);
}

export default memo(TransactionHistory);
