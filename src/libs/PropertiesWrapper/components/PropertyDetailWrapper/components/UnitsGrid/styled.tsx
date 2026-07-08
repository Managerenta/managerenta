"use client";
import styled from "styled-components";
import { Box } from "@/components";

export const UnitsGridStyled = styled(Box)`
	display: flex;
	flex-direction: column;
	gap: 15px;

	.units-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 10px;

		.units-title-row {
			display: flex;
			align-items: center;

			.units-title {
				font-size: 20px;
				font-weight: 700;
				color: var(--Black);
			}

			.units-count {
				width: 28px;
				height: 28px;
				border-radius: 50%;
				background: #e2e8f0;
				color: #64748b;
				font-size: 12px;
				font-weight: 600;
				display: flex;
				align-items: center;
				justify-content: center;
			}
		}

		.units-filters {
			display: flex;
			align-items: center;
			gap: 12px;

			.filter-tabs {
				display: flex;
				border: 1px solid var(--Border-Subtle);
				border-radius: 8px;
				overflow: hidden;

				.filter-tab {
					button {
						padding: 8px 16px;
						border: none;
						background: var(--Surface-Card);
						color: #64748b;
						font-size: 13px;
						font-weight: 500;
						cursor: pointer;
						border-radius: 0;
						white-space: nowrap;
						transition: all 0.2s;
					}

					&.active button {
						background: var(--Main-Blue);
						color: white;
					}

					&:not(:last-child) {
						border-right: 1px solid var(--Border-Subtle);
					}
				}
			}

			.sort-dropdown {
				width: 160px;
			}
		}
	}

	.units-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 15px;

		.unit-card {
			background: var(--Surface-Card);
			border-radius: 12px;
			padding: 15px 20px;
			border: 1px solid var(--Border-Subtle);
			display: flex;
			flex-direction: column;
			gap: 10px;

			.unit-name {
				font-size: 16px;
				font-weight: 700;
				color: var(--Black);
			}

			.status-badge {
				display: inline-flex;
				align-self: flex-start;
				padding: 4px 10px;
				border-radius: 6px;
				font-size: 12px;
				font-weight: 600;
			}

			.tenant-row {
				display: flex;
				align-items: center;
				gap: 5px;

				img {
					width: 38px;
					height: 38px;
					object-fit: cover;
					border-radius: 50%;
				}

				.tenant-name {
					font-size: 15px;
					font-weight: 600;
					color: var(--Black);
				}
			}

			.unit-rent {
				font-size: 16px;
				font-weight: 700;
				color: var(--Black);
			}

			.due-date {
				font-size: 14px;
				font-weight: 500;
				color: #94a3b8;
			}

			.payment-status {
				display: flex;
				align-items: center;
				gap: 6px;

				.payment-dot {
					width: 8px;
					height: 8px;
					border-radius: 50%;
				}
			}

			.vacant-info {
				font-size: 14px;
				font-weight: 500;
				color: #94a3b8;
			}

			.expected-rent {
				font-size: 14px;
				font-weight: 500;
				color: #94a3b8;
			}

			.unit-actions {
				display: flex;
				gap: 8px;

				.view-tenant-btn,
				.record-btn {
					flex: 1;

					button {
						width: 100%;
						font-size: 14px;
						font-weight: 500;
						padding: 5px 10px;
					}
				}

				.add-tenant-btn {
					width: 100%;

					button {
						width: 100%;
						font-size: 14px;
						font-weight: 500;
						padding: 5px 10px;
					}
				}
			}
		}
	}

	@media (max-width: 1200px) {
		.units-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	/* Two unit cards stop fitting once the content column drops below ~900px
	   (sidebar visible). */
	@media (max-width: 900px) {
		.units-grid {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 767px) {
		.units-header {
			flex-direction: column;
			align-items: flex-start;

			.units-filters {
				flex-direction: column;
				width: 100%;

				.filter-tabs {
					width: 100%;

					.filter-tab {
						flex: 1;

						button {
							width: 100%;
						}
					}
				}

				.sort-dropdown {
					width: 100%;
				}
			}
		}

		.units-grid {
			grid-template-columns: 1fr;
		}
	}
`;
