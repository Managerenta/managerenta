"use client";
import styled from "styled-components";
import { Box } from "@/components";

export const TenantsGridStyled = styled(Box)<{ $viewMode: "grid" | "list" }>`
	.grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 20px;
	}

	.tenant-card {
		background: var(--Surface-Card);
		border-radius: 12px;
		border: 1px solid var(--Border-Subtle);
		padding: 20px;
		display: flex;
		flex-direction: column;
		gap: 14px;
		transition: box-shadow 0.2s;

		&:hover {
			box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
		}

		.card-top {
			display: flex;
			align-items: flex-start;
			justify-content: space-between;

			.tenant-info {
				display: flex;
				align-items: center;
				gap: 12px;

				.avatar-placeholder {
					width: 60px;
					height: 60px;
					border-radius: 50%;
					background: linear-gradient(135deg, #94a3b8, #cbd5e1);
					flex-shrink: 0;
				}

				.info-text {
					display: flex;
					flex-direction: column;

					.tenant-name {
						font-size: 17px;
						font-weight: 700;
						color: var(--Black);
					}

					.tenant-property {
						font-size: 14px;
						color: var(--Text-Secondary);
					}
				}
			}

			.payment-badge {
				padding: 4px 10px;
				border-radius: 6px;
				font-size: 12px;
				font-weight: 600;
				white-space: nowrap;
				flex-shrink: 0;
			}
		}

		.card-details {
			display: flex;
			flex-direction: column;
			gap: 5px;
			padding: 12px 0;
			border-top: 1px solid var(--Border-Subtle);
			border-bottom: 1px solid var(--Border-Subtle);

			.detail-row {
				display: flex;
				align-items: center;
				gap: 8px;

				svg {
					color: var(--Text-Secondary);
					flex-shrink: 0;
				}

				.detail-value {
					font-size: 14px;
					color: var(--Text-Secondary);
					letter-spacing: 0.5px;
				}
			}
		}

		.card-footer {
			display: flex;
			justify-content: space-between;

			.rent-info,
			.lease-info {
				display: flex;
				flex-direction: column;
				gap: 2px;

				.rent-label,
				.lease-label {
					font-size: 14px;
					color: var(--Text-Secondary);
				}

				.rent-value {
					font-size: 16px;
					font-weight: 700;
					color: var(--Black);
				}

				.lease-value {
					font-size: 14px;
					font-weight: 600;
					color: var(--Black);
				}
			}
		}

		.card-action {
			border-top: 1px solid var(--Border-Subtle);

			button {
				width: 100%;
				text-align: center;
				background: none;
				border: none;
				color: var(--Text-Secondary);
				font-size: 16px;
				font-weight: 600;
				cursor: pointer;

				&:hover {
					color: var(--Main-Blue);
				}
			}
		}
	}

	.grid.list {
		grid-template-columns: 1fr;
		gap: 10px;
	}

	/* ── List mode overrides ── */
	.grid.list .tenant-card {
		flex-direction: row;
		align-items: center;
		gap: 16px;
		padding: 12px 16px;
		border-radius: 10px;

		.card-top {
			flex-shrink: 0;
			flex-direction: row;
			align-items: center;
			gap: 12px;

			.tenant-info {
				.avatar-placeholder {
					width: 44px;
					height: 44px;
				}

				.info-text .tenant-name {
					font-size: 15px;
				}
			}

			.payment-badge {
				display: none;
			}
		}

		.card-details {
			flex: 1;
			flex-direction: row;
			flex-wrap: wrap;
			gap: 8px 20px;
			border-top: none;
			border-bottom: none;
			border-left: 1px solid var(--Border-Subtle);
			border-right: 1px solid var(--Border-Subtle);
			padding: 0 16px;

			.detail-row {
				white-space: nowrap;
			}
		}

		.card-footer {
			flex-direction: column;
			gap: 4px;
			flex-shrink: 0;

			.rent-info {
				.rent-value {
					font-size: 15px;
				}
			}

			.lease-info {
				display: none;
			}
		}

		.card-action {
			border-top: none;
			border-left: 1px solid var(--Border-Subtle);
			padding-left: 16px;
			flex-shrink: 0;

			button {
				width: auto;
				white-space: nowrap;
				padding: 6px 14px;
			}
		}
	}

	@media (max-width: 1024px) {
		.grid:not(.list) {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (max-width: 767px) {
		.grid:not(.list) {
			grid-template-columns: 1fr;
		}

		.grid.list .tenant-card {
			flex-direction: column;
			align-items: flex-start;

			.card-top .payment-badge {
				display: flex;
			}

			.card-details {
				border-left: none;
				border-right: none;
				border-top: 1px solid var(--Border-Subtle);
				border-bottom: 1px solid var(--Border-Subtle);
				padding: 8px 0;
				width: 100%;
			}

			.card-action {
				border-left: none;
				border-top: 1px solid var(--Border-Subtle);
				padding-left: 0;
				width: 100%;
			}
		}
	}
`;
