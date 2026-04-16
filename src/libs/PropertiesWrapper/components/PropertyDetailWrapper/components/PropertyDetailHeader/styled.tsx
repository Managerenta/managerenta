"use client";
import styled from "styled-components";
import { Box } from "@/components";

export const PropertyDetailHeaderStyled = styled(Box)`
	display: flex;
	flex-direction: column;
	gap: 20px;

	.breadcrumb {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 14px;

		a {
			color: #3b82f6;
			text-decoration: none;

			&:hover {
				text-decoration: underline;
			}
		}

		.breadcrumb-link {
			cursor: pointer;
			p {
				color: #3b82f6;
				&:hover {
					text-decoration: underline;
				}
			}
		}

		.separator {
			color: #94a3b8;
		}

		.current {
			color: #64748b;
		}
	}

	.title-row {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 16px;

		.title-section {
			display: flex;
			flex-direction: column;
			gap: 6px;

			.property-name {
				font-size: 26px;
				font-weight: 700;
				color: var(--Black);
			}

			.property-address {
				font-size: 14px;
				color: #64748b;
			}

			.type-badge {
				display: inline-flex;
				align-self: flex-start;
				padding: 4px 12px;
				border-radius: 6px;
				font-size: 12px;
				font-weight: 600;
				background: #dbeafe;
				color: #2563eb;
				margin-top: 4px;
			}
		}

		.action-buttons {
			display: flex;
			flex-direction: row;
			align-items: center;
			gap: 12px;

			.edit-btn,
			.add-unit-btn {
				display: flex;
				align-items: center;
				justify-content: center;

				button {
					display: flex;
					align-items: center;
					justify-content: center;
					gap: 8px;
					padding: 8px 10px;
					border-radius: 8px;
					font-size: 14px;
					font-weight: 500;
					cursor: pointer;
					transition: opacity 0.2s;
					white-space: nowrap;

					&:hover {
						opacity: 0.9;
					}
				}
			}

			.edit-btn button {
				border: 1px solid var(--Border-Subtle);
			}
		}
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 16px;

		.stat-card {
			background: var(--Surface-Card);
			border-radius: 12px;
			padding: 20px;
			display: flex;
			flex-direction: column;
			gap: 8px;
			border: 1px solid var(--Border-Subtle);

			.stat-top {
				display: flex;
				align-items: center;
				justify-content: space-between;

				.stat-label {
					font-size: 13px;
					color: #64748b;
					font-weight: 500;
				}

				.stat-icon {
					width: 36px;
					height: 36px;
					border-radius: 10px;
					display: flex;
					align-items: center;
					justify-content: center;
				}
			}

			.stat-value {
				font-size: 32px;
				font-weight: 700;
				color: var(--Black);
			}

			.stat-subtext {
				font-size: 13px;
				font-weight: 500;
			}
		}
	}

	@media (max-width: 1024px) {
		.stats-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (max-width: 767px) {
		.title-row {
			flex-direction: column;

			.action-buttons {
				width: 100%;
				flex-wrap: wrap;
			}
		}

		.title-row .title-section .property-name {
			font-size: 20px;
		}

		.stats-grid {
			grid-template-columns: 1fr;
		}
	}
`;
