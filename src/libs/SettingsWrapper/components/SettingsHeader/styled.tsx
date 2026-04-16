"use client";
import styled from "styled-components";
import { Box } from "@/components";

export const SettingsHeaderStyled = styled(Box)`
	display: flex;
	flex-direction: column;
	gap: 20px;

	.title-section {
		display: flex;
		flex-direction: column;
		gap: 4px;

		.page-title {
			font-size: 24px;
			font-weight: 700;
			color: var(--Black);
			font-style: italic;
		}

		.page-subtitle {
			font-size: 14px;
			color: #64748b;
		}
	}

	.tabs-row {
		display: flex;
		gap: 4px;
		border-bottom: 1px solid var(--Border-Subtle);

		.tab-item {
			button {
				display: flex;
				align-items: center;
				gap: 6px;
				padding: 10px 18px;
				font-size: 14px;
				font-weight: 500;
				color: #64748b;
				background: none;
				border: none;
				border-bottom: 2px solid transparent;
				border-radius: 0;
				cursor: pointer;
				white-space: nowrap;
				transition: all 0.2s;

				&:hover {
					color: var(--Black);
				}
			}

			&.active button {
				color: var(--Main-Blue);
				border-bottom-color: var(--Main-Blue);
				font-weight: 600;
			}
		}
	}

	@media (max-width: 767px) {
		gap: 16px;

		.title-section .page-title {
			font-size: 20px;
		}

		.tabs-row {
			overflow-x: auto;
			gap: 0;
			-webkit-overflow-scrolling: touch;

			&::-webkit-scrollbar {
				display: none;
			}

			.tab-item button {
				padding: 10px 14px;
				font-size: 13px;
			}
		}
	}
`;
