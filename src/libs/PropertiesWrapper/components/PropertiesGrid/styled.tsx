"use client";
import styled from "styled-components";
import { Box } from "@/components";

export const PropertiesGridStyled = styled(Box)`
	.grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 15px;
	}

	.property-card {
		background: white;
		border-radius: 12px;
		border: 1px solid #f1f5f9;
		overflow: hidden;
		transition: box-shadow 0.2s;

		&:hover {
			box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
		}

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
				color: #64748b;
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

			.units-row {
				.units-text {
					font-size: 13px;
					color: #64748b;

					.occupied {
						color: #16a34a;
						font-weight: 500;
					}

					.vacant {
						color: #ef4444;
						font-weight: 500;
					}
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
						color: #64748b;
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
					background: #e2e8f0;
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
				border-top: 1px solid #f1f5f9;

				button {
					width: 100%;
					text-align: center;
					background: none;
					border: none;
					color: #64748b;
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
