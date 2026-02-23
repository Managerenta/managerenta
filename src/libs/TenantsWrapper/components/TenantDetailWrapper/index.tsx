"use client";
import { memo } from "react";
import { Box } from "@/components";
import { useTenantDetail, useTenantNavigation } from "@/hooks";
import {
	ContactInfo,
	PaymentStatistics,
	PaymentSummary,
	RecentActivity,
	TenantDetailHeader,
	TenantQuickActions,
	TransactionHistory,
} from "./components";
import { TenantDetailWrapperStyled } from "./styled";

function TenantDetailWrapper() {
	const { selectedTenantId } = useTenantNavigation();

	const {
		tenantDetail,
		transactions,
		paymentHistory,
		recentActivity,
		paymentStats,
		transactionTotals,
	} = useTenantDetail(selectedTenantId);

	if (!tenantDetail) return null;

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
