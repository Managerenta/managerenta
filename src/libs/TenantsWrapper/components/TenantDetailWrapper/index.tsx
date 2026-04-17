"use client";
import { memo, useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Box } from "@/components";
import { api } from "@/constants";
import { useTenantDetail } from "@/hooks";
import { TenantModal } from "@/layouts";
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
	const [isEditModalOpen, setIsEditModalOpen] = useState(false);
	const [mounted, setMounted] = useState(false);

	useEffect(() => setMounted(true), []);

	const {
		tenantDetail,
		transactions,
		paymentHistory,
		recentActivity,
		paymentStats,
		transactionTotals,
		mutate,
	} = useTenantDetail(selectedTenantId);

	const openEditModal = useCallback(() => setIsEditModalOpen(true), []);
	const closeEditModal = useCallback(() => setIsEditModalOpen(false), []);

	const handleTenantUpdated = useCallback(async () => {
		await mutate();
	}, [mutate]);

	const handleSendReminder = useCallback(async () => {
		if (!selectedTenantId) return;
		try {
			await api().post(`/api/tenants/${selectedTenantId}/send-reminder`);
			toast.success("Reminder sent successfully");
		} catch {
			toast.error("Failed to send reminder");
		}
	}, [selectedTenantId]);

	if (!tenantDetail) return null;

	return (
		<TenantDetailWrapperStyled>
			<TenantDetailHeader
				tenantDetail={tenantDetail}
				onEditTenant={openEditModal}
				onSendReminder={handleSendReminder}
			/>
			{mounted && (
				<TenantModal
					open={isEditModalOpen}
					close={closeEditModal}
					mode={{ type: "edit-tenant", tenant: tenantDetail }}
					onSuccess={handleTenantUpdated}
				/>
			)}

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
					<TenantQuickActions tenantId={selectedTenantId} />
					<PaymentStatistics stats={paymentStats} />
					<RecentActivity activities={recentActivity} />
				</Box>
			</Box>
		</TenantDetailWrapperStyled>
	);
}

export default memo(TenantDetailWrapper);
