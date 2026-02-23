"use client";
import styled from "styled-components";
import { Box } from "@/components";

export const ListedPropertiesStyled = styled(Box)`
	display: flex;
	flex-direction: column;
	gap: 12px;

	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;

		.section-title {
			font-size: 18px;
			font-weight: 700;
			color: var(--Black);
		}

		.view-all {
			background: none;
			border: none;
			color: #3b82f6;
			font-size: 13px;
			font-weight: 500;
			cursor: pointer;

			&:hover {
				text-decoration: underline;
			}
		}
	}

	.properties-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 16px;
	}

	.property-card {
		background: white;
		border-radius: 12px;
		border: 1px solid #f1f5f9;
		overflow: hidden;

		.property-image {
			width: 100%;
			height: 160px;

			.image-placeholder {
				width: 100%;
				height: 100%;
				background: linear-gradient(135deg, #94a3b8, #cbd5e1);
			}
		}

		/* .property-image {
			width: 100%;
			height: 160px;
			overflow: hidden;

			img {
				width: 100%;
				height: 100%;
				object-fit: cover;
			}
		} */

		.property-details {
			padding: 16px;
			display: flex;
			flex-direction: column;
			gap: 5px;

			.property-name {
				font-size: 16px;
				font-weight: 700;
				color: var(--Black);
			}

			.property-location {
				font-size: 13px;
				color: #64748b;
			}

			.occupancy-row {
				display: flex;
				justify-content: space-between;
				align-items: center;

				.occupancy-text {
					font-size: 12px;
					color: #64748b;
				}

				.occupancy-percent {
					font-size: 12px;
					font-weight: 600;
					color: #16a34a;
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
					background: #0ea5e9;
					border-radius: 6px;
					transition: width 0.5s ease;
				}
			}

			.revenue-row {
				display: flex;
				justify-content: space-between;
				align-items: center;
				margin-top: 4px;

				.revenue {
					font-size: 16px;
					font-weight: 700;
					color: var(--Black);
				}

				.view-details {
					background: none;
					border: none;
					color: #3b82f6;
					font-size: 13px;
					font-weight: 500;
					cursor: pointer;

					&:hover {
						text-decoration: underline;
					}
				}
			}
		}
	}

	@media (max-width: 767px) {
		.properties-grid {
			grid-template-columns: 1fr;
		}
	}
`;
