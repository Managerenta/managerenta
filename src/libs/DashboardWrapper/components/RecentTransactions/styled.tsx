"use client";
import styled from "styled-components";
import { Box } from "@/components";

export const RecentTransactionsStyled = styled(Box)`
	background: white;
	border-radius: 12px;
	padding: 20px;
	border: 1px solid #f1f5f9;
	display: flex;
	flex-direction: column;

	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;

		.section-title {
			font-size: 18px;
			font-weight: 700;
			color: var(--Black);
		}

		.view-all {
			background: none;
			border: none;
			color: #3b82f6;
			font-size: 13px;
			font-weight: 500;
			cursor: pointer;

			&:hover {
				text-decoration: underline;
			}
		}
	}

	.transaction-list {
		display: flex;
		flex-direction: column;

		.empty-state {
			font-size: 15px;
			color: #94a3b8;
			padding: 16px;
			text-align: center;
		}
	}

	.transaction-row {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 12px 0;
		border-bottom: 1px solid #f8fafc;
		cursor: pointer;
		transition: background 0.15s ease;

		&:hover {
			background: #f8fafc;
		}

		&:last-child {
			border-bottom: none;
		}

		.tx-indicator {
			width: 8px;
			height: 8px;
			border-radius: 50%;
			flex-shrink: 0;

			&.credit {
				background: #22c55e;
			}
			&.debit {
				background: #ef4444;
			}
		}

		.tx-info {
			flex: 1;
			display: flex;
			flex-direction: column;
			gap: 2px;

			.tx-name {
				font-size: 14px;
				font-weight: 600;
				color: var(--Black);
			}

			.tx-meta {
				font-size: 12px;
				color: #94a3b8;
			}
		}

		.tx-amount {
			font-size: 14px;
			font-weight: 700;
			white-space: nowrap;

			&.credit {
				color: #16a34a;
			}
			&.debit {
				color: #ef4444;
			}
		}
	}
`;
