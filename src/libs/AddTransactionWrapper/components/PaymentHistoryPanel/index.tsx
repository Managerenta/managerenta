"use client";
import { memo, useMemo } from "react";
import { Box, Text } from "@/components";
import { useAddTransactionData } from "@/hooks";
import { PaymentHistoryPanelStyled } from "./styled";

function PaymentHistoryPanel() {
	const { paymentHistory, averageAmount } = useAddTransactionData();

	const renderedHistory = useMemo(() => {
		return paymentHistory.map(
			({ id, label, date, amount, amountColor, note, noteColor }) => (
				<Box key={id} className="history-row">
					<Box className="history-left">
						<Text className="history-label">{label}</Text>
						<Text className="history-date">{date}</Text>
					</Box>
					<Box className="history-right">
						<Text className="history-amount" style={{ color: amountColor }}>
							{amount}
						</Text>
						{note && (
							<Text className="history-note" style={{ color: noteColor }}>
								{note}
							</Text>
						)}
					</Box>
				</Box>
			),
		);
	}, [paymentHistory]);

	return (
		<PaymentHistoryPanelStyled>
			<Text className="panel-title">Payment History</Text>
			<Box className="history-list">{renderedHistory}</Box>
			<Box className="average-row">
				<Text className="average-label">Average Amount</Text>
				<Text className="average-value">{averageAmount}</Text>
			</Box>
		</PaymentHistoryPanelStyled>
	);
}

export default memo(PaymentHistoryPanel);
