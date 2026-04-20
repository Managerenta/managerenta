"use client";
import styled from "styled-components";
import { Box } from "@/components";

export const KeyboardShortcutsPanelStyled = styled(Box)`
	background: var(--Surface-Card);
	border-radius: 12px;
	padding: 20px;
	border: 1px solid var(--Border-Subtle);
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
			color: var(--Text-Secondary);
		}

		.shortcut-key {
			padding: 4px 10px;
			background: var(--Surface-Muted);
			border: 1px solid var(--Border-Subtle);
			border-radius: 6px;
			font-size: 12px;
			font-weight: 600;
			color: var(--Text-Secondary);
			font-family: monospace;
		}
	}

	@media (max-width: 767px) {
		padding: 16px;
		display: none;
	}
`;
