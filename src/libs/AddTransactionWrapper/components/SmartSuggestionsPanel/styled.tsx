"use client";
import styled from "styled-components";
import { Box } from "@/components";

export const SmartSuggestionsPanelStyled = styled(Box)`
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

	.suggestions-list {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.suggestion-card {
		display: flex;
		align-items: flex-start;
		gap: 12px;
		padding: 14px;
		border-radius: 10px;
		cursor: pointer;
		transition: opacity 0.2s;

		&:hover {
			opacity: 0.85;
		}

		.suggestion-icon {
			flex-shrink: 0;
			margin-top: 2px;
		}

		.suggestion-content {
			display: flex;
			flex-direction: column;
			gap: 2px;

			.suggestion-label {
				font-size: 14px;
				font-weight: 700;
			}

			.suggestion-desc {
				font-size: 13px;
				color: #334155;
			}
		}
	}

	@media (max-width: 767px) {
		padding: 16px;
	}
`;
