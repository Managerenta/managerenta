"use client";
import styled from "styled-components";
import { Box } from "@/components";

export const QuickActionsStyled = styled(Box)`
	background: var(--Surface-Card);
	border-radius: 12px;
	padding: 15px 10px;
	border: 1px solid var(--Border-Subtle);
	display: flex;
	flex-direction: column;
	gap: 10px;

	.section-title {
		padding: 0 10px;
		font-size: 18px;
		font-weight: 700;
		color: var(--Black);
	}

	.actions-list {
		width: 100%;
		display: flex;
		flex-direction: column;

		.quick-action-item {
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
				width: 40px;
				height: 40px;
				border-radius: 10px;
				background: var(--Surface-Page);
				display: flex;
				align-items: center;
				justify-content: center;
				color: var(--Text-Secondary);
				flex-shrink: 0;
			}

			.action-label {
				width: 100%;
				font-size: 17px;
				font-weight: 500;
				color: var(--Black);
			}
		}
	}
`;
