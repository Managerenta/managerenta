"use client";
import styled from "styled-components";
import { Box } from "@/components";

export const NotificationsSettingsStyled = styled(Box)`
	background: var(--Surface-Card);
	border-radius: 12px;
	padding: 20px;
	border: 1px solid var(--Border-Subtle);
	display: flex;
	flex-direction: column;
	gap: 24px;

	.section {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.section-title {
		font-size: 16px;
		font-weight: 700;
		color: var(--Black);
	}

	.row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		padding: 12px 14px;
		background: var(--Surface-Page);
		border-radius: 10px;
	}

	.row-text {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.row-label {
		font-size: 14px;
		font-weight: 600;
		color: var(--Black);
	}

	.row-desc {
		font-size: 12px;
		color: #94a3b8;
	}

	.toggle-switch {
		width: 44px;
		height: 24px;
		border-radius: 12px;
		background: #e2e8f0;
		cursor: pointer;
		position: relative;
		transition: background 0.2s;
		flex-shrink: 0;

		.toggle-thumb {
			width: 20px;
			height: 20px;
			border-radius: 50%;
			background: var(--Surface-Card);
			position: absolute;
			top: 2px;
			left: 2px;
			transition: transform 0.2s;
			box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
		}

		&.active {
			background: var(--Main-Blue);

			.toggle-thumb {
				transform: translateX(20px);
			}
		}

		&.saving {
			opacity: 0.6;
		}
	}

	.loading-hint {
		font-size: 12px;
		color: #94a3b8;
	}
`;
