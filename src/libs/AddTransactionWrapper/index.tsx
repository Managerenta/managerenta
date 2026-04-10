"use client";
import { memo } from "react";
import { Box } from "@/components";
import { useTenantDetail } from "@/hooks";
import {
	AddTransactionHeader,
	KeyboardShortcutsPanel,
	PaymentHistoryPanel,
	SmartSuggestionsPanel,
	TenantSummary,
	TransactionForm,
} from "./components";
import { AddTransactionWrapperStyled } from "./styled";

interface IProps {
	tenantId: string;
}

function AddTransactionWrapper({ tenantId }: IProps) {
	const { tenantDetail, transactions, paymentStats, isLoading } =
		useTenantDetail(tenantId);

	return (
		<AddTransactionWrapperStyled>
			<AddTransactionHeader
				tenantName={tenantDetail?.name ?? ""}
				tenantId={tenantId}
			/>

			<Box className="content-grid">
				<Box className="left-column">
					<TenantSummary
						name={tenantDetail?.name ?? ""}
						avatar={tenantDetail?.avatar ?? ""}
						property={tenantDetail?.property ?? ""}
						unit={tenantDetail?.unit ?? ""}
						outstandingBalance={paymentStats.outstandingBalance}
						isOverdue={(tenantDetail?.overdueDays ?? 0) > 0}
						isLoading={isLoading}
					/>
					<TransactionForm
						tenantId={tenantId}
						monthlyRent={tenantDetail?.monthlyRent ?? ""}
					/>
				</Box>
				<Box className="right-column">
					<PaymentHistoryPanel
						transactions={transactions.slice(0, 3)}
						isLoading={isLoading}
					/>
					<SmartSuggestionsPanel
						monthlyRent={tenantDetail?.monthlyRent ?? ""}
					/>
					<KeyboardShortcutsPanel />
				</Box>
			</Box>
		</AddTransactionWrapperStyled>
	);
}

export default memo(AddTransactionWrapper);
