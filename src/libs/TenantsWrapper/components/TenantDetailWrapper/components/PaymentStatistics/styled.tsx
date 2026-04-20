"use client";
import styled from "styled-components";
import { Box } from "@/components";

export const PaymentStatisticsStyled = styled(Box)`
	background: var(--Surface-Card);
	border-radius: 12px;
	padding: 24px;
	border: 1px solid var(--Border-Subtle);
	display: flex;
	flex-direction: column;
	gap: 16px;

	.card-title {
		font-size: 18px;
		font-weight: 700;
		color: var(--Black);
	}

	.stat-row {
		display: flex;
		flex-direction: column;
		gap: 4px;

		.stat-label {
			font-size: 13px;
			color: var(--Text-Secondary);
		}

		.score-row {
			display: flex;
			align-items: center;
			gap: 10px;

			.score-value {
				font-size: 24px;
				font-weight: 700;
				color: var(--Black);
			}

			.score-badge {
				padding: 3px 10px;
				border-radius: 6px;
				font-size: 12px;
				font-weight: 600;
				background: #fef3c7;
				color: #ca8a04;

				[data-theme="dark"] & {
					background: rgba(202, 138, 4, 0.15);
				}
			}
		}

		.stat-value {
			font-size: 18px;
			font-weight: 700;
			color: var(--Black);

			&.bold {
				font-weight: 800;
			}

			&.red {
				color: #ef4444;
			}
		}
	}

	.chart-section {
		display: flex;
		flex-direction: column;
		gap: 12px;

		.chart-title {
			font-size: 13px;
			font-weight: 600;
			color: #64748b;
		}

		.chart-placeholder {
			width: 100%;
			height: 120px;
			background: var(--Surface-Page);
			border-radius: 8px;
			border: 1px dashed #e2e8f0;
		}
	}

	@media (max-width: 767px) {
		padding: 16px;

		.stat-row {
			flex-direction: row;
			justify-content: space-between;
			align-items: center;
			padding: 8px 0;
			border-bottom: 1px solid var(--Border-Subtle);

			.score-row {
				.score-value {
					font-size: 20px;
				}
			}

			.stat-value {
				font-size: 16px;
			}
		}

		.chart-section {
			.chart-placeholder {
				height: 100px;
			}
		}
	}
`;
