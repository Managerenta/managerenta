"use client";
import styled from "styled-components";
import { Box } from "@/components";

export const TenantsHeaderStyled = styled(Box)`
	display: flex;
	flex-direction: column;
	gap: 20px;

	.top-row {
		display: flex;
		align-items: center;
		justify-content: space-between;

		.title {
			font-size: 24px;
			font-weight: 700;
			color: var(--Black);
		}

		.add-btn {
			display: flex;
			align-items: center;
			justify-content: center;

			button {
				display: flex;
				align-items: center;
				justify-content: center;
				gap: 8px;
				padding: 23px 8px;
				border-radius: 8px;
				font-size: 16px;
				font-weight: 500;
				cursor: pointer;
				transition: opacity 0.2s;
				white-space: nowrap;

				&:hover {
					opacity: 0.9;
				}
			}
		}
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 16px;

		.stat-card {
			background: var(--Surface-Card);
			border-radius: 12px;
			padding: 20px;
			display: flex;
			flex-direction: column;
			gap: 8px;
			border: 1px solid var(--Border-Subtle);

			.stat-top {
				display: flex;
				align-items: center;
				justify-content: space-between;

				.stat-label {
					font-size: 13px;
					color: #64748b;
					font-weight: 500;
				}

				.stat-icon {
					width: 36px;
					height: 36px;
					border-radius: 10px;
					display: flex;
					align-items: center;
					justify-content: center;
				}
			}

			.stat-value {
				font-size: 32px;
				font-weight: 700;
				color: var(--Black);
			}

			.stat-subtext {
				font-size: 13px;
				font-weight: 500;
			}
		}
	}

	@media (max-width: 1024px) {
		.stats-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (max-width: 767px) {
		.top-row {
			.title {
				font-size: 20px;
			}

			.add-btn {
				button {
					display: flex;
					align-items: center;
					justify-content: center;
					gap: 8px;
					padding: 15px 10px;
				}
			}
		}

		.stats-grid {
			grid-template-columns: 1fr;
		}
	}
`;
