"use client";
import styled from "styled-components";
import { Box } from "@/components";

export const PaymentSummaryStyled = styled(Box)`
	background: white;
	border-radius: 12px;
	padding: 24px;
	border: 1px solid #f1f5f9;
	display: flex;
	flex-direction: column;
	gap: 16px;

	.section-title {
		font-size: 16px;
		font-weight: 700;
		color: var(--Black);
	}

	.overdue-status {
		display: flex;
		align-items: center;
		gap: 8px;

		.overdue-dot {
			width: 10px;
			height: 10px;
			border-radius: 50%;
			background: #ef4444;
		}

		.overdue-text {
			font-size: 18px;
			font-weight: 700;
			color: #ef4444;
		}
	}

	.payment-details {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 20px;

		.detail-item {
			display: flex;
			flex-direction: column;
			gap: 4px;

			.detail-label {
				font-size: 13px;
				color: #64748b;
			}

			.detail-value {
				font-size: 16px;
				font-weight: 700;
				color: var(--Black);

				&.green {
					color: #16a34a;
				}
			}

			.detail-sub {
				font-size: 12px;
				color: #94a3b8;
			}
		}
	}

	.history-section {
		display: flex;
		flex-direction: column;
		gap: 10px;

		.history-title {
			font-size: 13px;
			font-weight: 600;
			color: #64748b;
		}

		.history-blocks {
			display: flex;
			gap: 4px;
			flex-wrap: nowrap;
			overflow-x: auto;

			.history-block-wrap {
				display: flex;
				flex-direction: column;
				align-items: center;
				gap: 4px;
				flex-shrink: 0;

				.history-block {
					width: 28px;
					height: 12px;
					border-radius: 3px;

					&.upcoming {
						border: 1px dashed #cbd5e1;
						background: #f8fafc !important;
					}
				}

				.block-month {
					font-size: 10px;
					color: #94a3b8;
					white-space: nowrap;
				}
			}
		}

		.history-legend {
			display: flex;
			gap: 16px;

			.legend-item {
				display: flex;
				align-items: center;
				gap: 6px;

				.legend-dot {
					width: 8px;
					height: 8px;
					border-radius: 50%;
				}

				p {
					font-size: 12px;
					color: #64748b;
				}
			}
		}
	}

	@media (max-width: 767px) {
		padding: 16px;

		.overdue-status {
			justify-content: space-between;

			.overdue-text {
				font-size: 16px;
			}
		}

		.payment-details {
			grid-template-columns: 1fr 1fr;
			gap: 14px;

			.detail-item {
				display: flex;
				flex-direction: row;
				justify-content: space-between;
				align-items: center;
				gap: 8px;

				.detail-label {
					font-size: 13px;
				}

				.detail-value {
					font-size: 14px;
					text-align: right;
				}
			}

			grid-template-columns: 1fr;
		}

		.history-section {
			.history-blocks {
				.history-block-wrap {
					.history-block {
						width: 20px;
						height: 10px;
					}
					.block-month {
						font-size: 9px;
					}
				}
			}
		}
	}
`;
