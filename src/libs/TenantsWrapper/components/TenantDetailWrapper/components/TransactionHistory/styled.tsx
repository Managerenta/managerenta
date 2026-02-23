"use client";
import styled from "styled-components";
import { Box } from "@/components";

export const TransactionHistoryStyled = styled(Box)`
	background: white;
	border-radius: 12px;
	padding: 24px;
	border: 1px solid #f1f5f9;
	display: flex;
	flex-direction: column;
	gap: 20px;

	.section-title {
		font-size: 16px;
		font-weight: 700;
		color: var(--Black);
	}

	.filters-row {
		display: flex;
		align-items: center;
		gap: 12px;
		flex-wrap: wrap;

		.filter-select {
			padding: 8px 14px;
			border: 1px solid #e2e8f0;
			border-radius: 8px;
			font-size: 13px;
			color: var(--Black);
			background: white;
			cursor: pointer;
		}

		.search-input {
			flex: 1;
			min-width: 160px;

			input {
				width: 100%;
				padding: 8px 14px;
				border: 1px solid #e2e8f0;
				border-radius: 8px;
				font-size: 13px;
				color: var(--Black);

				&::placeholder {
					color: #94a3b8;
				}
			}
		}

		.export-btn button {
			display: flex;
			align-items: center;
			gap: 6px;
			padding: 8px 16px;
			font-size: 13px;
			font-weight: 500;
			white-space: nowrap;
		}
	}

	.table-container {
		width: 100%;
		overflow-x: auto;

		table {
			width: 100%;
			border-collapse: collapse;

			th,
			td {
				text-align: left;
				padding: 12px 10px;
				font-size: 13px;
				white-space: nowrap;
			}

			th {
				color: #64748b;
				font-weight: 600;
				border-bottom: 1px solid #e2e8f0;
			}

			td {
				color: var(--Black);
				border-bottom: 1px solid #f8fafc;
			}

			.type-cell {
				display: flex;
				align-items: center;
				gap: 6px;

				svg {
					color: #64748b;
				}
			}

			.cell-amount {
				font-weight: 600;

				&.credit {
					color: #16a34a;
				}

				&.debit {
					color: #ef4444;
				}
			}

			.cell-balance {
				font-weight: 500;
			}

			.action-icon {
				color: #94a3b8;
				cursor: pointer;

				&:hover {
					color: var(--Main-Blue);
				}
			}
		}
	}

	.mobile-transactions {
		display: none;
	}

	.totals-row {
		display: flex;
		gap: 40px;
		padding-top: 16px;
		border-top: 1px solid #e2e8f0;

		.total-item {
			display: flex;
			flex-direction: column;
			gap: 4px;

			.total-label {
				font-size: 12px;
				color: #64748b;
			}

			.total-value {
				font-size: 16px;
				font-weight: 700;
				color: var(--Black);

				&.green {
					color: #16a34a;
				}

				&.bold {
					font-weight: 800;
				}
			}
		}
	}

	@media (max-width: 767px) {
		padding: 16px;
		gap: 16px;

		.section-title {
			display: flex;
			align-items: center;
			justify-content: space-between;
		}

		.filters-row {
			flex-direction: row;
			flex-wrap: nowrap;
			overflow-x: auto;
			gap: 8px;
			padding-bottom: 4px;

			.filter-select {
				padding: 6px 12px;
				font-size: 12px;
				border-radius: 20px;
				white-space: nowrap;
				min-width: auto;
			}

			.search-input {
				display: none;
			}

			.export-btn {
				display: none;
			}
		}

		.table-container {
			display: none;
		}

		.mobile-transactions {
			display: flex;
			flex-direction: column;
			gap: 12px;

			.transaction-card {
				display: flex;
				align-items: center;
				gap: 12px;
				padding: 14px;
				background: #f8fafc;
				border-radius: 12px;

				.txn-icon {
					width: 40px;
					height: 40px;
					border-radius: 50%;
					display: flex;
					align-items: center;
					justify-content: center;
					flex-shrink: 0;

					&.credit {
						background: #d1fae5;
						color: #16a34a;
					}

					&.debit {
						background: #fee2e2;
						color: #ef4444;
					}
				}

				.txn-content {
					flex: 1;
					display: flex;
					flex-direction: column;
					gap: 2px;

					.txn-description {
						font-size: 14px;
						font-weight: 600;
						color: var(--Black);
					}

					.txn-meta {
						font-size: 12px;
						color: #94a3b8;
					}
				}

				.txn-amounts {
					text-align: right;
					display: flex;
					flex-direction: column;
					gap: 2px;
					flex-shrink: 0;

					.txn-amount {
						font-size: 14px;
						font-weight: 700;

						&.credit {
							color: #16a34a;
						}

						&.debit {
							color: var(--Black);
						}
					}

					.txn-balance {
						font-size: 11px;
						color: #94a3b8;
					}
				}
			}
		}

		.totals-row {
			flex-direction: column;
			gap: 12px;
			padding-top: 14px;

			.total-item {
				display: flex;
				flex-direction: row;
				justify-content: space-between;
				align-items: center;

				.total-label {
					font-size: 13px;
				}

				.total-value {
					font-size: 18px;
				}
			}
		}
	}
`;
