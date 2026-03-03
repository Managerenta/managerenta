"use client";
import styled from "styled-components";
import { Box } from "@/components";

export const KeyboardShortcutsPanelStyled = styled(Box)`
	background: white;
	border-radius: 12px;
	padding: 20px;
	border: 1px solid #f1f5f9;
	display: flex;
	flex-direction: column;
	gap: 14px;

	.panel-title {
		font-size: 18px;
		font-weight: 700;
		color: var(--Black);
	}

	.shortcuts-list {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.shortcut-row {
		display: flex;
		justify-content: space-between;
		align-items: center;

		.shortcut-label {
			font-size: 14px;
			color: #64748b;
		}

		.shortcut-key {
			padding: 4px 10px;
			background: #f1f5f9;
			border: 1px solid #e2e8f0;
			border-radius: 6px;
			font-size: 12px;
			font-weight: 600;
			color: #64748b;
			font-family: monospace;
		}
	}

	@media (max-width: 767px) {
		padding: 16px;
		display: none;
	}
`;
