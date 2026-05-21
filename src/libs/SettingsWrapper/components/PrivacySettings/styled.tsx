"use client";
import styled from "styled-components";
import { Box } from "@/components";

export const PrivacySettingsStyled = styled(Box)`
	display: flex;
	flex-direction: column;
	gap: 16px;

	.section {
		background: var(--Surface-Card);
		border-radius: 12px;
		padding: 20px;
		border: 1px solid var(--Border-Subtle);
		display: flex;
		flex-direction: column;
		gap: 10px;

		&.danger {
			border-color: #fecaca;
		}
	}

	.section-title {
		font-size: 16px;
		font-weight: 700;
		color: var(--Black);
	}

	.section-desc {
		font-size: 13px;
		color: #64748b;
		line-height: 1.5;
	}

	.confirm-input {
		padding: 10px 14px;
		border: 1px solid var(--Border-Subtle);
		border-radius: 8px;
		font-size: 14px;
		color: var(--Black);
		background: var(--Surface-Page);
		max-width: 320px;
	}

	.action-btn {
		align-self: flex-start;

		button {
			padding: 10px 24px;
			font-size: 14px;
			font-weight: 500;
		}
	}
`;
