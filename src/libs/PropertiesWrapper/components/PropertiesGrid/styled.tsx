"use client";
import styled from "styled-components";
import { Box } from "@/components";

export const PropertiesGridStyled = styled(Box)<{ $viewMode: "grid" | "list" }>`
	.grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 15px;

		&.list {
			grid-template-columns: 1fr;
			gap: 10px;
		}
	}

	.property-card {
		background: var(--Surface-Card);
		border-radius: 12px;
		border: 1px solid var(--Border-Subtle);
		overflow: hidden;
		transition: box-shadow 0.2s;

		&:hover {
			box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
		}

		/* ── Grid card layout ── */
		.card-image {
			width: 100%;
			height: 200px;
			overflow: hidden;

			.image-placeholder {
				width: 100%;
				height: 100%;
				background: linear-gradient(135deg, #94a3b8, #cbd5e1);
			}

			img {
				width: 100%;
				height: 100%;
				object-fit: contain;
			}
		}

		.card-body {
			padding: 16px;
			display: flex;
			flex-direction: column;
			gap: 6px;

			.card-name {
				font-size: 16px;
				font-weight: 700;
				color: var(--Black);
			}

			.card-address {
				font-size: 14px;
				color: var(--Text-Secondary);
				line-height: 1;
			}

			.type-badge {
				display: inline-flex;
				align-self: flex-start;
				padding: 4px 10px;
				border-radius: 6px;
				font-size: 12px;
				font-weight: 600;
			}

			.units-row .units-text {
				font-size: 13px;
				color: var(--Text-Secondary);

				.occupied {
					color: #16a34a;
					font-weight: 500;
				}

				.vacant {
					color: #ef4444;
					font-weight: 500;
				}
			}

			.occupancy-section {
				display: flex;
				flex-direction: column;
				gap: 6px;

				.occupancy-label-row {
					display: flex;
					justify-content: space-between;
					align-items: center;

					.occupancy-label {
						font-size: 13px;
						color: var(--Text-Secondary);
					}

					.occupancy-value {
						font-size: 13px;
						font-weight: 700;
						color: var(--Black);
					}
				}

				.occupancy-bar {
					width: 100%;
					height: 6px;
					background: var(--Border-Subtle);
					border-radius: 6px;
					overflow: hidden;

					.occupancy-fill {
						height: 100%;
						border-radius: 6px;
						transition: width 0.5s ease;
					}
				}
			}

			.status-badge {
				display: inline-flex;
				align-self: flex-start;
				padding: 4px 10px;
				border-radius: 6px;
				font-size: 12px;
				font-weight: 600;
			}

			.card-revenue {
				font-size: 20px;
				font-weight: 700;
				color: var(--Black);
			}

			.card-footer {
				border-top: 1px solid var(--Border-Subtle);

				button {
					width: 100%;
					text-align: center;
					background: none;
					border: none;
					color: var(--Text-Secondary);
					font-size: 14px;
					font-weight: 600;
					cursor: pointer;

					&:hover {
						color: var(--Main-Blue);
					}
				}
			}
		}
	}

	/* ── List mode overrides ── */
	.grid.list .property-card {
		display: flex;
		flex-direction: row;
		align-items: center;
		border-radius: 10px;

		.card-image {
			width: 80px;
			height: 80px;
			flex-shrink: 0;
			border-radius: 0;
		}

		.card-body {
			flex: 1;
			flex-direction: row;
			align-items: center;
			gap: 16px;
			padding: 12px 16px;
			flex-wrap: wrap;

			.card-name {
				min-width: 140px;
				font-size: 15px;
			}

			.card-address {
				flex: 1;
				min-width: 120px;
			}

			.type-badge {
				white-space: nowrap;
			}

			.units-row {
				white-space: nowrap;
			}

			.occupancy-section {
				min-width: 120px;
				flex-direction: row;
				align-items: center;
				gap: 8px;

				.occupancy-bar {
					width: 80px;
				}
			}

			.status-badge {
				white-space: nowrap;
			}

			.card-revenue {
				font-size: 15px;
				white-space: nowrap;
			}

			.card-footer {
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

		.grid.list .property-card {
			flex-direction: column;

			.card-image {
				width: 100%;
				height: 140px;
			}

			.card-body {
				flex-direction: column;
				align-items: flex-start;

				.card-footer {
					border-left: none;
					border-top: 1px solid var(--Border-Subtle);
					padding-left: 0;
					width: 100%;
				}
			}
		}
	}
`;
