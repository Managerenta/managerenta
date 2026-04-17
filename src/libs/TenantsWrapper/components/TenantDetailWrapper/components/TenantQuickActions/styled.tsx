"use client";
import styled from "styled-components";
import { Box } from "@/components";

export const TenantQuickActionsStyled = styled(Box)`
	background: var(--Surface-Card);
	border-radius: 12px;
	padding: 20px;
	border: 1px solid var(--Border-Subtle);

	.card-title {
		font-size: 18px;
		font-weight: 700;
		color: var(--Black);
		margin-bottom: 16px;
	}

	.actions-list {
		display: flex;
		flex-direction: column;
		gap: 4px;

		.primary-action {
			margin-bottom: 8px;

			button {
				width: 100%;
				padding: 12px;
				font-size: 14px;
			}
		}

		.action-item {
			display: flex;
			align-items: center;
			gap: 12px;
			padding: 12px;
			border-radius: 8px;
			cursor: pointer;
			transition: background 0.2s;

			&:hover {
				background: var(--Surface-Page);
			}

			.action-icon {
				width: 32px;
				height: 32px;
				border-radius: 8px;
				background: var(--Surface-Muted);
				display: flex;
				align-items: center;
				justify-content: center;
				color: var(--Text-Secondary);
				flex-shrink: 0;
			}

			.action-label {
				font-size: 14px;
				font-weight: 500;
				color: var(--Black);
			}
		}
	}

	@media (max-width: 767px) {
		padding: 10px;

		.card-title {
			display: none;
		}

		.actions-list {
			flex-direction: column;
			gap: 8px;
			justify-content: space-between;

			.primary-action {
				flex: 1;
				margin-bottom: 0;

				button {
					padding: 10px 12px;
					font-size: 15px;
				}
			}

			.action-item {
				flex-direction: column;
				gap: 8px;
				padding: 10px 8px;
				align-items: center;
				flex: 0;

				.action-icon {
					width: 46px;
					height: 46px;
				}

				.action-label {
					font-size: 15px;
					text-align: center;
					white-space: nowrap;
				}
			}
		}
	}
`;
