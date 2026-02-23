"use client";
import styled from "styled-components";
import { Box } from "@/components";

export const TenantsGridStyled = styled(Box)`
	.grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 20px;
	}

	.tenant-card {
		background: white;
		border-radius: 12px;
		border: 1px solid #f1f5f9;
		padding: 20px;
		display: flex;
		flex-direction: column;
		gap: 16px;
		transition: box-shadow 0.2s;

		&:hover {
			box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
		}

		.card-top {
			display: flex;
			align-items: flex-start;
			justify-content: space-between;
			gap: 12px;

			.tenant-info {
				display: flex;
				align-items: center;
				gap: 12px;

				.avatar-placeholder {
					width: 44px;
					height: 44px;
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
			gap: 8px;
			padding: 12px 0;
			border-top: 1px solid #f1f5f9;
			border-bottom: 1px solid #f1f5f9;

			.detail-row {
				display: flex;
				align-items: center;
				gap: 8px;

				svg {
					color: #94a3b8;
					flex-shrink: 0;
				}

				.detail-value {
					font-size: 13px;
					color: #64748b;
				}
			}
		}

		.card-footer {
			display: flex;
			justify-content: space-between;
			gap: 12px;

			.rent-info,
			.lease-info {
				display: flex;
				flex-direction: column;
				gap: 2px;

				.rent-label,
				.lease-label {
					font-size: 12px;
					color: #94a3b8;
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
			border-top: 1px solid #f1f5f9;
			padding-top: 12px;

			button {
				width: 100%;
				text-align: center;
				background: none;
				border: none;
				color: #64748b;
				font-size: 14px;
				font-weight: 500;
				cursor: pointer;

				&:hover {
					color: var(--Main-Blue);
				}
			}
		}
	}

	@media (max-width: 1024px) {
		.grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (max-width: 767px) {
		.grid {
			grid-template-columns: 1fr;
		}
	}
`;
