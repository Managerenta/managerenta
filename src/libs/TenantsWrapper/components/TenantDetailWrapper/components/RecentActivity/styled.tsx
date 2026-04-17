"use client";
import styled from "styled-components";
import { Box } from "@/components";

export const RecentActivityStyled = styled(Box)`
	background: var(--Surface-Card);
	border-radius: 12px;
	padding: 24px;
	border: 1px solid var(--Border-Subtle);

	.card-title {
		font-size: 18px;
		font-weight: 700;
		color: var(--Black);
		margin-bottom: 16px;
	}

	.activity-list {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.activity-item {
		display: flex;
		gap: 12px;
		align-items: flex-start;

		.activity-dot {
			width: 10px;
			height: 10px;
			border-radius: 50%;
			flex-shrink: 0;
			margin-top: 5px;
		}

		.activity-content {
			display: flex;
			flex-direction: column;
			gap: 2px;

			.activity-label {
				font-size: 14px;
				font-weight: 600;
				color: var(--Black);
			}

			.activity-detail {
				font-size: 12px;
				color: #94a3b8;
			}
		}
	}

	@media (max-width: 767px) {
		padding: 16px;

		.card-title {
			font-size: 16px;
			margin-bottom: 12px;
		}

		.activity-list {
			gap: 14px;
		}

		.activity-item {
			gap: 10px;
			padding-bottom: 14px;
			border-bottom: 1px solid #f8fafc;

			&:last-child {
				padding-bottom: 0;
				border-bottom: none;
			}

			.activity-content {
				.activity-label {
					font-size: 13px;
				}

				.activity-detail {
					font-size: 11px;
				}
			}
		}
	}
`;
