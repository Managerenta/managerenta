"use client";
import styled from "styled-components";
import { Box } from "@/components";

export const TransactionHistoryStyled = styled(Box)`
	background: var(--Surface-Card);
	border-radius: 12px;
	padding: 24px;
	border: 1px solid var(--Border-Subtle);
	display: flex;
	flex-direction: column;
	gap: 20px;

	.preview-overlay {
		position: fixed;
		inset: 0;
		background: rgba(15, 23, 42, 0.45);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
	}

	.preview-modal {
		width: 100%;
		max-width: 420px;
		background: var(--Surface-Card);
		border-radius: 12px;
		padding: 20px;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.preview-title {
		font-size: 16px;
		font-weight: 700;
		color: var(--Black);
	}

	.preview-grid {
		display: grid;
		grid-template-columns: 140px 1fr;
		row-gap: 6px;
		column-gap: 12px;
		font-size: 13px;
		color: #475569;
	}

	.preview-close {
		display: flex;
		justify-content: flex-end;
		margin-top: 4px;

		button {
			padding: 8px 16px;
		}
	}

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
			width: 180px;
		}

		.search-input {
			flex: 1;
			min-width: 160px;

			input {
				width: 100%;
				padding: 8px 14px;
				border: 1px solid var(--Border-Subtle);
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
				border-bottom: 1px solid var(--Border-Subtle);
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

			.cell-actions {
				width: 80px;
			}

			.actions-row {
				display: flex;
				align-items: center;
				gap: 10px;
			}

			.action-icon {
				color: #94a3b8;
				cursor: pointer;
				flex-shrink: 0;

				&:hover {
					color: var(--Main-Blue);
				}

				&.download-icon {
					&:hover {
						color: #16a34a;
					}

					&.loading {
						opacity: 0.5;
						cursor: not-allowed;
						pointer-events: none;
					}
				}
			}

			.share-menu-wrapper {
				display: flex;
				align-items: center;
				gap: 10px;
			}

			.share-trigger-wrapper {
				position: relative;
			}

			.share-dropdown {
				position: absolute;
				right: 0;
				top: calc(100% + 6px);
				background: var(--Surface-Card);
				border: 1px solid var(--Border-Subtle);
				border-radius: 8px;
				box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
				min-width: 180px;
				z-index: 50;
				overflow: hidden;

				.share-option {
					display: flex;
					align-items: center;
					gap: 10px;
					padding: 10px 14px;
					font-size: 13px;
					color: var(--Black);
					cursor: pointer;
					transition: background 0.15s;

					&:hover {
						background: var(--Surface-Muted);
					}

					svg {
						color: var(--Text-Secondary);
					}
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
		border-top: 1px solid var(--Border-Subtle);

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
				width: 150px;
				flex: 0 0 auto;
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
				background: var(--Surface-Page);
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

						[data-theme="dark"] & {
							background: rgba(22, 163, 74, 0.15);
						}
					}

					&.debit {
						background: #fee2e2;
						color: #ef4444;

						[data-theme="dark"] & {
							background: rgba(239, 68, 68, 0.15);
						}
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

				.txn-card-actions {
					display: flex;
					align-items: center;
					flex-shrink: 0;
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
