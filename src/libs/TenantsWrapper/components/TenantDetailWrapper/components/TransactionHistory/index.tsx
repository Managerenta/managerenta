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
		toast.info("Email sharing coming soon");
	}, []);

	const handleWhatsAppShare = useCallback(() => {
		setOpen(false);
		toast.info("WhatsApp sharing coming soon");
	}, []);

	return (
		<Box className="share-menu-wrapper">
			<FiDownload
				size={16}
				className={`action-icon download-icon ${isDownloading ? "loading" : ""}`}
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

	const renderedRows = useMemo(() => {
		return transactions.map((txn) => {
			const {
				id,
				date,
				type,
				description,
				paymentMethod,
				amount,
				amountType,
				runningBalance,
			} = txn;
			return (
				<tr key={id}>
					<td className="cell-date">{date}</td>
					<td className="cell-type">
						<Box className="type-cell">
							{getTypeIcon(type)}
							<Text>{type}</Text>
						</Box>
					</td>
					<td className="cell-desc">{description}</td>
					<td className="cell-method">{paymentMethod}</td>
					<td className={`cell-amount ${amountType}`}>
						{amountType === "debit" ? "-" : "+"}
						{amount}
					</td>
					<td className="cell-balance">{runningBalance}</td>
					<td className="cell-actions">
						<Box className="actions-row">
							<FiEye
								size={16}
								className="action-icon"
								title="View"
							/>
							<ShareMenu
								transaction={txn}
								tenantInfo={tenantInfo}
							/>
						</Box>
					</td>
				</tr>
			);
		});
	}, [transactions, tenantInfo]);

	const renderedMobileCards = useMemo(() => {
		return transactions.map((txn) => {
			const {
				id,
				date,
				type,
				description,
				paymentMethod,
				amount,
				amountType,
				runningBalance,
			} = txn;
			return (
				<Box key={id} className="transaction-card">
					<Box className={`txn-icon ${amountType}`}>
						{getTypeIcon(type)}
					</Box>
					<Box className="txn-content">
						<Text className="txn-description">{description}</Text>
						<Text className="txn-meta">
							{date} • {paymentMethod}
						</Text>
					</Box>
					<Box className="txn-amounts">
						<Text className={`txn-amount ${amountType}`}>
							{amountType === "debit" ? "" : "+"}
							{amount}
						</Text>
						<Text className="txn-balance">
							Balance: {runningBalance}
						</Text>
					</Box>
					<Box className="txn-card-actions">
						<ShareMenu transaction={txn} tenantInfo={tenantInfo} />
					</Box>
				</Box>
			);
		});
	}, [transactions, tenantInfo]);

	return (
		<TransactionHistoryStyled>
			<Text className="section-title">Transaction History</Text>

			<Box className="filters-row">
				<select className="filter-select" defaultValue="all">
					<option value="all">All Transactions</option>
					<option value="rent">Rent</option>
					<option value="maintenance">Maintenance</option>
				</select>

				<select className="filter-select" defaultValue="3months">
					<option value="3months">Last 3 Months</option>
					<option value="6months">Last 6 Months</option>
					<option value="1year">Last Year</option>
				</select>

				<Box className="search-input">
					<Input type="text" placeholder="Search transactions..." />
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
		</TransactionHistoryStyled>
	);
}

export default memo(TransactionHistory);
