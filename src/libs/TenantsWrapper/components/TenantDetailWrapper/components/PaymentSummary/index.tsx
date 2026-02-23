"use client";
import { memo, useMemo } from "react";
import { Box, Text } from "@/components";
import type { IPaymentHistoryBlock, ITenantDetail } from "@/types";
import { PaymentSummaryStyled } from "./styled";

interface IProps {
	tenantDetail: ITenantDetail;
	paymentHistory: IPaymentHistoryBlock[];
}

function getBlockColor(status: string): string {
	switch (status) {
		case "paid":
			return "#22c55e";
		case "late":
			return "#f59e0b";
		case "overdue":
			return "#ef4444";
		default:
			return "#e2e8f0";
	}
}

function PaymentSummary({ tenantDetail, paymentHistory }: IProps) {
	const {
		overdueStatus,
		monthlyRent,
		rentDueDay,
		nextDueDate,
		lastPaymentAmount,
		lastPaymentDate,
	} = tenantDetail;

	const renderedBlocks = useMemo(() => {
		return paymentHistory.map(({ id, status }) => (
			<Box
				key={id}
				className="history-block"
				style={{ background: getBlockColor(status) }}
			/>
		));
	}, [paymentHistory]);

	return (
		<PaymentSummaryStyled>
			<Text className="section-title">Payment Summary</Text>

			<Box className="overdue-status">
				<Box className="overdue-dot" />
				<Text className="overdue-text">{overdueStatus}</Text>
			</Box>

			<Box className="payment-details">
				<Box className="detail-item">
					<Text className="detail-label">Monthly Rent</Text>
					<Text className="detail-value green">{monthlyRent}</Text>
				</Box>
				<Box className="detail-item">
					<Text className="detail-label">Rent Due Day</Text>
					<Text className="detail-value">{rentDueDay}</Text>
				</Box>
				<Box className="detail-item">
					<Text className="detail-label">Next Due Date</Text>
					<Text className="detail-value">{nextDueDate}</Text>
				</Box>
				<Box className="detail-item">
					<Text className="detail-label">Last Payment</Text>
					<Text className="detail-value green">
						{lastPaymentAmount}
					</Text>
					<Text className="detail-sub">{lastPaymentDate}</Text>
				</Box>
			</Box>

			<Box className="history-section">
				<Text className="history-title">Payment History Pattern</Text>
				<Box className="history-blocks">{renderedBlocks}</Box>
				<Box className="history-legend">
					<Box className="legend-item">
						<Box
							className="legend-dot"
							style={{ background: "#22c55e" }}
						/>
						<Text>Paid</Text>
					</Box>
					<Box className="legend-item">
						<Box
							className="legend-dot"
							style={{ background: "#f59e0b" }}
						/>
						<Text>Late</Text>
					</Box>
					<Box className="legend-item">
						<Box
							className="legend-dot"
							style={{ background: "#ef4444" }}
						/>
						<Text>Overdue</Text>
					</Box>
				</Box>
			</Box>
		</PaymentSummaryStyled>
	);
}

export default memo(PaymentSummary);
