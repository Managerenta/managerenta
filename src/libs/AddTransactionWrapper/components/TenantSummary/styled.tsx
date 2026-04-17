"use client";
import styled from "styled-components";
import { Box } from "@/components";

export const TenantSummaryStyled = styled(Box)`
	background: var(--Surface-Card);
	border-radius: 12px;
	padding: 20px;
	border: 1px solid var(--Border-Subtle);
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 16px;

	.tenant-info {
		display: flex;
		align-items: center;
		gap: 14px;

		.avatar-placeholder {
			width: 48px;
			height: 48px;
			border-radius: 50%;
			background: linear-gradient(135deg, #94a3b8, #cbd5e1);
			flex-shrink: 0;
		}

		.info-text {
			display: flex;
			flex-direction: column;
			gap: 2px;

			.tenant-name {
				font-size: 16px;
				font-weight: 700;
				color: var(--Black);
			}

			.tenant-property {
				font-size: 13px;
				color: #64748b;
			}
		}
	}

	.balance-info {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 4px;

		.balance-label {
			font-size: 12px;
			color: #64748b;
		}

		.balance-value {
			font-size: 22px;
			font-weight: 700;
			color: #ef4444;
		}

		.overdue-badge {
			padding: 2px 10px;
			border-radius: 6px;
			font-size: 12px;
			font-weight: 600;
			background: #fee2e2;
			color: #ef4444;
		}
	}

	@media (max-width: 767px) {
		flex-direction: column;
		align-items: flex-start;
		gap: 14px;
		padding: 16px;

		.balance-info {
			align-items: flex-start;
			width: 100%;
			padding-top: 12px;
			border-top: 1px solid var(--Border-Subtle);

			.balance-value {
				font-size: 20px;
			}
		}
	}
`;
