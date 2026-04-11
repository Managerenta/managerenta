"use client";
import { memo, useCallback, useMemo } from "react";
import { Box, Button, Text } from "@/components";
import { useDashboardData, useTenantNavigation } from "@/hooks";
import { RecentTransactionsStyled } from "./styled";

function RecentTransactions() {
	const { transactions } = useDashboardData();
	const { openTenantDetail } = useTenantNavigation();

	const handleRowClick = useCallback(
		(tenantId: string) => {
			if (tenantId) openTenantDetail(tenantId);
		},
		[openTenantDetail],
	);

	const renderedTransactions = useMemo(() => {
		return transactions.map((tx) => (
			<Box
				key={tx.id}
				className="transaction-row"
				onClick={() => handleRowClick(tx.tenantId)}
			>
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
	}, [transactions, handleRowClick]);

	return (
		<RecentTransactionsStyled>
			<Box className="section-header">
				<Text className="section-title">Recent Transactions</Text>
				<Box className="view-all">
					<Button
						type="button"
						background="inherit"
						title="View All"
					/>
				</Box>
			</Box>
			<Box className="transaction-list">
				{transactions.length > 0 ? (
					renderedTransactions
				) : (
					<Text className="empty-state">No recent transactions</Text>
				)}
			</Box>
		</RecentTransactionsStyled>
	);
}

export default memo(RecentTransactions);
