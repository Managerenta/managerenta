"use client";
import { memo, useMemo } from "react";
import { Box, Button, Text } from "@/components";
import { useDashboardData } from "@/hooks";
import { RecentTransactionsStyled } from "./styled";

function RecentTransactions() {
	const { transactions } = useDashboardData();

	const renderedTransactions = useMemo(() => {
		return transactions.map((tx) => (
			<Box key={tx.id} className="transaction-row">
				<Box className={`tx-indicator ${tx.type}`} />
				<Box className="tx-info">
					<Text className="tx-name">{tx.name}</Text>
					<Text className="tx-meta">
						{tx.date} • {tx.unit}
					</Text>
				</Box>
				<Text className={`tx-amount ${tx.type}`}>
					{tx.type === "credit" ? "+" : "-"}
					{tx.amount}
				</Text>
			</Box>
		));
	}, [transactions]);

	return (
		<RecentTransactionsStyled>
			<Box className="section-header">
				<Text className="section-title">Recent Transactions</Text>
				<Box className="view-all">
					<Button type="button" title="View All" />
				</Box>
			</Box>
			<Box className="transaction-list">{renderedTransactions}</Box>
		</RecentTransactionsStyled>
	);
}

export default memo(RecentTransactions);
