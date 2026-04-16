"use client";
import styled from "styled-components";
import { Box } from "@/components";

export const PropertySidebarStyled = styled(Box)`
	display: flex;
	flex-direction: column;
	gap: 24px;

	.card-title {
		font-size: 18px;
		font-weight: 700;
		color: var(--Black);
		margin-bottom: 16px;
	}

	.quick-actions-card {
		background: var(--Surface-Card);
		border-radius: 12px;
		padding: 24px;
		border: 1px solid var(--Border-Subtle);

		.actions-list {
			display: flex;
			flex-direction: column;
			gap: 4px;

			.add-unit-action {
				button {
					width: 100%;
					padding: 12px;
					font-size: 14px;
				}
			}

			.action-item {
				display: flex;
				align-items: center;
				gap: 12px;
				padding: 12px;
				border-radius: 8px;
				cursor: pointer;
				transition: background 0.2s;

				&:hover {
					background: var(--Surface-Page);
				}

				.action-icon {
					width: 32px;
					height: 32px;
					border-radius: 8px;
					background: var(--Surface-Muted);
					display: flex;
					align-items: center;
					justify-content: center;
					color: var(--Text-Secondary);
					flex-shrink: 0;
				}

				.action-label {
					font-size: 14px;
					font-weight: 500;
					color: var(--Black);
				}
			}
		}
	}

	.statistics-card {
		background: var(--Surface-Card);
		border-radius: 12px;
		padding: 24px;
		border: 1px solid var(--Border-Subtle);
		display: flex;
		flex-direction: column;
		gap: 16px;

		.stat-section {
			display: flex;
			flex-direction: column;
			gap: 12px;

			.chart-placeholder {
				width: 100%;
				height: 120px;
				background: var(--Surface-Page);
				border-radius: 8px;
				border: 1px dashed #e2e8f0;
			}
		}

		.stat-subtitle {
			font-size: 14px;
			font-weight: 600;
			color: var(--Text-Secondary);
		}

		.stat-row {
			display: flex;
			flex-direction: column;
			gap: 4px;

			.stat-label {
				font-size: 13px;
				color: var(--Text-Secondary);
			}

			.stat-value-text {
				font-size: 16px;
				color: var(--Black);

				&.bold {
					font-weight: 700;
				}
			}
		}

		.top-tenants {
			display: flex;
			flex-direction: column;
			gap: 10px;

			.tenants-list {
				display: flex;
				flex-direction: column;
				gap: 8px;
			}

			.tenant-row {
				display: flex;
				justify-content: space-between;
				align-items: center;

				.tenant-name {
					font-size: 14px;
					color: var(--Black);
				}

				.tenant-amount {
					font-size: 14px;
					font-weight: 700;
					color: var(--Black);
				}
			}
		}
	}
`;
