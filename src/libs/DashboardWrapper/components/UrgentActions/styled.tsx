"use client";
import styled from "styled-components";
import { Box } from "@/components";

export const UrgentActionsStyled = styled(Box)`
	background: var(--Surface-Card);
	border-radius: 12px;
	padding: 20px;
	border: 1px solid var(--Border-Subtle);
	display: flex;
	flex-direction: column;
	gap: 20px;

	.section-header {
		display: flex;
		align-items: center;
		gap: 10px;

		.section-title {
			font-size: 20px;
			font-weight: 700;
			color: var(--Black);
		}

		.badge-count {
			width: 24px;
			height: 24px;
			border-radius: 50%;
			background: #ef4444;
			color: white;
			font-size: 12px;
			font-weight: 600;
			display: flex;
			align-items: center;
			justify-content: center;
		}
	}

	.subsection {
		display: flex;
		flex-direction: column;
		gap: 10px;

		.subsection-title {
			font-size: 16px;
			font-weight: 600;
			color: var(--Black);
		}
	}

	.action-list {
		display: flex;
		flex-direction: column;
		gap: 10px;

		.empty-state {
			font-size: 15px;
			color: #94a3b8;
			padding: 12px;
			text-align: center;
		}

		.action-row {
			display: flex;
			align-items: center;
			gap: 12px;
			padding: 12px;
			border-radius: 10px;
			background: #fefce8;
			border: 1px solid #fef08a;

			&.overdue-row {
				background: #fef2f2;
				border-color: #fecaca;
			}

			.avatar-placeholder {
				width: 40px;
				height: 40px;
				border-radius: 50%;
				background: #e2e8f0;
				flex-shrink: 0;
			}

			/* .tenant-avatar {
			width: 40px;
			height: 40px;
			border-radius: 50%;
			flex-shrink: 0;
			overflow: hidden;

			img {
				width: 100%;
				height: 100%;
				object-fit: cover;
			}
		} */

			.tenant-info {
				display: flex;
				flex-direction: column;
				flex: 1;
				min-width: 0;

				.tenant-name {
					font-size: 14px;
					font-weight: 600;
					color: var(--Black);
				}

				.tenant-property {
					font-size: 12px;
					color: #64748b;
				}
			}

			.amount {
				font-size: 15px;
				font-weight: 700;
				color: var(--Black);
				white-space: nowrap;
			}

			.overdue-badge {
				font-size: 12px;
				font-weight: 500;
				color: #ef4444;
				background: #fee2e2;
				padding: 4px 8px;
				border-radius: 6px;
				white-space: nowrap;
			}

			.action-buttons {
				display: flex;
				gap: 8px;
				flex-shrink: 0;

				Button {
					padding: 2px 12px;
					border-radius: 10px;
					font-size: 14px;
					font-weight: 500;
					cursor: pointer;
					border: none;
					white-space: nowrap;
				}
			}
		}
	}

	@media (max-width: 767px) {
		.action-row {
			flex-wrap: wrap;

			.action-buttons {
				width: 100%;
				margin-top: 8px;
			}
		}
	}
`;
