"use client";
import { memo } from "react";
import { Box } from "@/components";
import {
	AddTransactionHeader,
	TenantSummary,
	TransactionForm,
	PaymentHistoryPanel,
	SmartSuggestionsPanel,
	KeyboardShortcutsPanel,
} from "./components";
import { AddTransactionWrapperStyled } from "./styled";

function AddTransactionWrapper() {
	return (
		<AddTransactionWrapperStyled>
			<AddTransactionHeader />

			<Box className="content-grid">
				<Box className="left-column">
					<TenantSummary />
					<TransactionForm />
				</Box>
				<Box className="right-column">
					<PaymentHistoryPanel />
					<SmartSuggestionsPanel />
					<KeyboardShortcutsPanel />
				</Box>
			</Box>
		</AddTransactionWrapperStyled>
	);
}

export default memo(AddTransactionWrapper);
