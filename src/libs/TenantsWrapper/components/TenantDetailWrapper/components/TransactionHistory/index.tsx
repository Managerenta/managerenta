"use client";
import { memo, useMemo } from "react";
import { FiHome, FiTool, FiEye, FiDownload, FiZap } from "react-icons/fi";
import { Box, Button, Input, Text } from "@/components";
import type { ITenantTransaction } from "@/types";
import { TransactionHistoryStyled } from "./styled";

interface IProps {
	transactions: ITenantTransaction[];
	totals: {
		totalReceived: string;
		totalExpenses: string;
		netBalance: string;
	};
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

function TransactionHistory({ transactions, totals }: IProps) {
	const { totalReceived, totalExpenses, netBalance } = totals;

	const renderedRows = useMemo(() => {
		return transactions.map(
			({
				id,
				date,
				type,
				description,
				paymentMethod,
				amount,
				amountType,
				runningBalance,
			}) => (
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
						<FiEye size={16} className="action-icon" />
					</td>
				</tr>
			),
		);
	}, [transactions]);

	const renderedMobileCards = useMemo(() => {
		return transactions.map(
			({
				id,
				date,
				type,
				description,
				paymentMethod,
				amount,
				amountType,
				runningBalance,
			}) => (
				<Box key={id} className="transaction-card">
					<Box className={`txn-icon ${amountType}`}>{getTypeIcon(type)}</Box>
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
						<Text className="txn-balance">Balance: {runningBalance}</Text>
					</Box>
				</Box>
			),
		);
	}, [transactions]);

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
								style={{ display: "flex", alignItems: "center", gap: "6px" }}>
								<FiDownload size={14} />
								<span>Export</span>
							</Box>
						}
						background="white"
						color="var(--Main-Blue)"
						border="1px solid #e2e8f0"
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
					<Text className="total-label">Total Payments</Text>
					<Text className="total-value green">{totalReceived}</Text>
				</Box>
				<Box className="total-item">
					<Text className="total-label">Total Expenses</Text>
					<Text className="total-value">{totalExpenses}</Text>
				</Box>
				<Box className="total-item">
					<Text className="total-label">Net Balance</Text>
					<Text className="total-value green bold">{netBalance}</Text>
				</Box>
			</Box>
		</TransactionHistoryStyled>
	);
}

export default memo(TransactionHistory);
