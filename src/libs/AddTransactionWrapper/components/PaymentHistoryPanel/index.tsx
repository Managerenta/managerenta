"use client";
import { memo, useMemo } from "react";
import { Box, Text } from "@/components";
import type { ITenantTransaction } from "@/types";
import { PaymentHistoryPanelStyled } from "./styled";

interface IProps {
	transactions: ITenantTransaction[];
	isLoading: boolean;
}

function PaymentHistoryPanel({ transactions, isLoading }: IProps) {
	const averageAmount = useMemo(() => {
		const credits = transactions.filter((t) => t.amountType === "credit");
		if (!credits.length) return "—";
		return credits[0].amount;
	}, [transactions]);

	const renderedHistory = useMemo(() => {
		if (isLoading) {
			return Array.from({ length: 3 }, (_, i) => (
				<Box key={i} className="history-row skeleton" />
			));
		}
		if (!transactions.length) {
			return (
				<Text style={{ fontSize: "13px", color: "#94a3b8" }}>
					No payment history yet.
				</Text>
			);
		}
		return transactions.map((t) => (
			<Box key={t.id} className="history-row">
				<Box className="history-left">
					<Text className="history-label">
						{t.type.charAt(0).toUpperCase() + t.type.slice(1)}
					</Text>
					<Text className="history-date">{t.date}</Text>
				</Box>
				<Box className="history-right">
					<Text
						className="history-amount"
						style={{
							color:
								t.amountType === "credit"
									? "#16a34a"
									: "#ef4444",
						}}
					>
						{t.amountType === "debit" ? "-" : ""}
						{t.amount}
					</Text>
					{t.description && (
						<Text
							className="history-note"
							style={{ color: "#64748b" }}
						>
							{t.description}
						</Text>
					)}
				</Box>
			</Box>
		));
	}, [transactions, isLoading]);

	return (
		<PaymentHistoryPanelStyled>
			<Text className="panel-title">Recent Transactions</Text>
			<Box className="history-list">{renderedHistory}</Box>
			{transactions.length > 0 && (
				<Box className="average-row">
					<Text className="average-label">Last Payment</Text>
					<Text className="average-value">{averageAmount}</Text>
				</Box>
			)}
		</PaymentHistoryPanelStyled>
	);
}

export default memo(PaymentHistoryPanel);
