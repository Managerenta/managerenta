"use client";
import { useRouter } from "next/navigation";
import { memo, useCallback } from "react";
import { Box } from "@/components";
import { api } from "@/constants";
import { useTenantDetail, useToast } from "@/hooks";
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

interface IProps {
	tenantId: string;
}

function TenantDetailWrapper({ tenantId: selectedTenantId }: IProps) {
	const toast = useToast();
	const router = useRouter();

	const {
		tenantDetail,
		transactions,
		paymentHistory,
		recentActivity,
		paymentStats,
		transactionTotals,
	} = useTenantDetail(selectedTenantId);

	const handleEditTenant = useCallback(() => {
		router.push(`/tenants/${selectedTenantId}/edit`);
	}, [router, selectedTenantId]);

	const handleSendReminder = useCallback(async () => {
		if (!selectedTenantId) return;
		try {
			await api().post(`/api/tenants/${selectedTenantId}/send-reminder`);
			toast.push("Reminder sent successfully", { type: "success" });
		} catch {
			toast.push("Failed to send reminder", { type: "warn" });
		}
	}, [selectedTenantId, toast]);

	if (!tenantDetail) return null;

	return (
		<TenantDetailWrapperStyled>
			<TenantDetailHeader
				tenantDetail={tenantDetail}
				onEditTenant={handleEditTenant}
				onSendReminder={handleSendReminder}
			/>

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
						tenantInfo={{
							name: tenantDetail.name,
							property: tenantDetail.property,
							unit: tenantDetail.unit,
							email: tenantDetail.email,
							phone: tenantDetail.phone,
						}}
					/>
				</Box>
				<Box className="right-grid">
					<TenantQuickActions
						tenantId={selectedTenantId}
						propertyId={tenantDetail.propertyId}
						tenantName={tenantDetail.name}
						transactions={transactions}
						onSendReminder={handleSendReminder}
					/>
					<PaymentStatistics stats={paymentStats} />
					<RecentActivity activities={recentActivity} />
				</Box>
			</Box>
		</TenantDetailWrapperStyled>
	);
}

export default memo(TenantDetailWrapper);
