"use client";
import styled from "styled-components";
import { Box } from "@/components";

export const PropertyOverviewStyled = styled(Box)`
	background: var(--Surface-Card);
	border-radius: 12px;
	padding: 24px;
	border: 1px solid var(--Border-Subtle);
	display: grid;
	grid-template-columns: 1fr 1fr 1fr;
	gap: 40px;

	.section-title {
		font-size: 16px;
		font-weight: 700;
		color: var(--Black);
		margin-bottom: 12px;
	}

	.info-section {
		display: flex;
		flex-direction: column;
		gap: 8px;

		.info-row {
			display: flex;
			align-items: center;
			gap: 8px;

			.info-label {
				font-size: 14px;
				color: #64748b;
			}

			.info-value {
				font-size: 14px;
				color: var(--Black);

				&.bold {
					font-weight: 700;
				}
			}
		}
	}

	.occupancy-section {
		display: flex;
		flex-direction: column;
		gap: 8px;

		.occupancy-value {
			font-size: 32px;
			font-weight: 700;
			color: var(--Black);
		}

		.progress-bar-container {
			width: 100%;
			height: 10px;
			background: #e2e8f0;
			border-radius: 10px;
			overflow: hidden;

			.progress-bar {
				height: 100%;
				background: #22c55e;
				border-radius: 10px;
				transition: width 0.5s ease;
			}
		}
	}

	.quick-actions-section {
		display: flex;
		flex-direction: column;
		gap: 8px;

		.action-link {
			font-size: 14px;
			color: #3b82f6;
			cursor: pointer;

			&:hover {
				text-decoration: underline;
			}
		}
	}

	@media (max-width: 1024px) {
		grid-template-columns: 1fr;
		gap: 24px;
	}
`;
