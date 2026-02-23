"use client";
import styled from "styled-components";
import { Box } from "@/components";

export const MonthlyOverviewStyled = styled(Box)`
	background: white;
	border-radius: 12px;
	padding: 20px;
	border: 1px solid #f1f5f9;
	display: flex;
	flex-direction: column;
	gap: 15px;

	.section-title {
		font-size: 18px;
		font-weight: 700;
		color: var(--Black);
	}

	.overview-stats {
		display: flex;
		flex-direction: row;
		justify-content: space-between;

		.overview-item {
			display: flex;
			flex-direction: column;
			gap: 4px;

			.dot {
				width: 10px;
				height: 10px;
				border-radius: 50%;
				margin-bottom: 4px;

				&.red {
					background: #ef4444;
				}
				&.green {
					background: #22c55e;
				}
				&.yellow {
					background: #eab308;
				}
			}

			.overview-label {
				font-size: 13px;
				color: #64748b;
			}

			.overview-value {
				font-size: 28px;
				font-weight: 700;
				color: var(--Black);
			}

			.overview-sublabel {
				font-size: 13px;
				color: #64748b;
			}

			.progress-bar-container {
				width: 100%;
				min-width: 200px;
				height: 8px;
				background: #e2e8f0;
				border-radius: 10px;
				overflow: hidden;
				margin-top: 8px;

				.progress-bar {
					height: 100%;
					background: #22c55e;
					border-radius: 10px;
					transition: width 0.5s ease;
				}
			}
		}
	}

	@media (max-width: 767px) {
		.overview-stats {
			flex-direction: column;
			gap: 20px;
		}

		.overview-stats .overview-item {
			.overview-value {
				font-size: 22px;
			}

			.progress-bar-container {
				min-width: unset;
			}
		}
	}
`;
