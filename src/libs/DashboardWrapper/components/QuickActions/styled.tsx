"use client";
import styled from "styled-components";
import { Box } from "@/components";

export const QuickActionsStyled = styled(Box)`
	background: white;
	border-radius: 12px;
	padding: 15px 10px;
	border: 1px solid #f1f5f9;
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
				background: #f8fafc;
			}

			.action-icon {
				width: 40px;
				height: 40px;
				border-radius: 10px;
				background: #f1f5f9;
				display: flex;
				align-items: center;
				justify-content: center;
				color: #64748b;
				flex-shrink: 0;
			}

			.action-label {
				width: 100%;
				font-size: 17px;
				font-weight: 500;
				color: var(--Secondary-100);
			}
		}
	}
`;
