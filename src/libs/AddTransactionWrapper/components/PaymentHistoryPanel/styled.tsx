"use client";
import styled from "styled-components";
import { Box } from "@/components";

export const PaymentHistoryPanelStyled = styled(Box)`
	background: var(--Surface-Card);
	border-radius: 12px;
	padding: 20px;
	border: 1px solid var(--Border-Subtle);
	display: flex;
	flex-direction: column;
	gap: 16px;

	.panel-title {
		font-size: 18px;
		font-weight: 700;
		color: var(--Black);
	}

	.history-list {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	.history-row {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		padding-bottom: 14px;
		border-bottom: 1px solid #f8fafc;

		&:last-child {
			padding-bottom: 0;
			border-bottom: none;
		}

		.history-left {
			display: flex;
			flex-direction: column;
			gap: 2px;

			.history-label {
				font-size: 13px;
				color: #64748b;
			}

			.history-date {
				font-size: 15px;
				font-weight: 700;
				color: var(--Black);
			}
		}

		.history-right {
			text-align: right;
			display: flex;
			flex-direction: column;
			gap: 2px;

			.history-amount {
				font-size: 16px;
				font-weight: 700;
			}

			.history-note {
				font-size: 12px;
			}
		}
	}

	.average-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding-top: 14px;
		border-top: 1px solid var(--Border-Subtle);

		.average-label {
			font-size: 13px;
			color: #64748b;
		}

		.average-value {
			font-size: 16px;
			font-weight: 700;
			color: var(--Black);
		}
	}

	@media (max-width: 767px) {
		padding: 16px;
	}
`;
