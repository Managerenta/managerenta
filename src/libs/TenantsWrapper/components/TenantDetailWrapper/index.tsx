"use client";
import { memo } from "react";
import { Box } from "@/components";
import {
	useTenantDetail,
	useTenantNavigation,
	useAddTransactionNavigation,
} from "@/hooks";
import { AddTransactionWrapper } from "@/libs";
import {
	TenantDetailHeader,
	ContactInfo,
	PaymentSummary,
	TransactionHistory,
	TenantQuickActions,
	PaymentStatistics,
	RecentActivity,
} from "./components";
import { TenantDetailWrapperStyled } from "./styled";

function TenantDetailWrapper() {
	const { selectedTenantId } = useTenantNavigation();
	const { isAddTransactionView } = useAddTransactionNavigation();

	const {
		tenantDetail,
		transactions,
		paymentHistory,
		recentActivity,
		paymentStats,
		transactionTotals,
	} = useTenantDetail(selectedTenantId);

	if (!tenantDetail) return null;

	if (isAddTransactionView) {
		return <AddTransactionWrapper />;
	}

	return (
		<TenantDetailWrapperStyled>
			<TenantDetailHeader tenantDetail={tenantDetail} />

			<Box className="bottom-grid">
				<Box className="left-grid">
					<ContactInfo tenantDetail={tenantDetail} />
					<PaymentSummary
						tenantDetail={tenantDetail}
						paymentHistory={paymentHistory}
					/>
					<TransactionHistory
						transactions={transactions}
						totals={transactionTotals}
					/>
				</Box>
				<Box className="right-grid">
					<TenantQuickActions />
					<PaymentStatistics stats={paymentStats} />
					<RecentActivity activities={recentActivity} />
				</Box>
			</Box>
		</TenantDetailWrapperStyled>
	);
}

export default memo(TenantDetailWrapper);
