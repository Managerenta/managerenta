"use client";
import styled from "styled-components";
import { Box } from "@/components";

export const IamStyled = styled(Box)`
	display: flex;
	flex-direction: column;
	gap: 18px;

	.tab-bar {
		display: flex;
		gap: 6px;
		border-bottom: 1px solid var(--Border-Subtle);
	}
	.tab {
		padding: 10px 16px;
		font-size: 14px;
		font-weight: 600;
		color: var(--Text-Secondary);
		cursor: pointer;
		border-bottom: 2px solid transparent;
		margin-bottom: -1px;
	}
	.tab:hover {
		color: var(--Text-Primary);
	}
	.tab.active {
		color: var(--mr-color-brand);
		border-bottom-color: var(--mr-color-brand);
	}

	.section {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.create-row {
		display: flex;
		gap: 10px;
		flex-wrap: wrap;
		align-items: flex-start;
		background: var(--Surface-Card);
		border: 1px solid var(--Border-Subtle);
		border-radius: var(--mr-radius-md);
		padding: 14px;
	}
	.create-row input,
	.create-row textarea {
		flex: 1 1 220px;
		min-width: 180px;
		min-height: 44px;
		padding: 10px 14px;
		border: 1px solid var(--Border-Subtle);
		border-radius: var(--mr-radius-sm);
		background: var(--Surface-Card);
		color: var(--Text-Primary);
		font-size: 14px;
		font-family: inherit;
	}
	.create-row.column {
		flex-direction: column;
		align-items: stretch;
	}
	.create-row textarea {
		font-family: monospace;
		min-height: 160px;
		resize: vertical;
	}

	.cards {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	.iam-card {
		background: var(--Surface-Card);
		border: 1px solid var(--Border-Subtle);
		border-radius: var(--mr-radius-md);
		padding: 16px;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	.iam-card .card-top {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 12px;
		flex-wrap: wrap;
	}
	.iam-card .card-name {
		font-size: 15px;
		font-weight: 700;
		color: var(--Black);
	}
	.iam-card .card-meta {
		font-size: 12px;
		color: var(--Text-Secondary);
		margin-top: 2px;
	}
	.iam-card .card-actions {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
		align-items: center;
	}
	.sub-block {
		border-top: 1px solid var(--Border-Subtle);
		padding-top: 12px;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.sub-title {
		font-size: 12px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--Text-Secondary);
	}
	.member-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		padding: 8px 10px;
		border: 1px solid var(--Border-Subtle);
		border-radius: var(--mr-radius-sm);
	}
	.inline-form {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
		align-items: center;
	}
	.inline-form input {
		flex: 1 1 200px;
		min-width: 160px;
		height: 40px;
		padding: 0 12px;
		border: 1px solid var(--Border-Subtle);
		border-radius: var(--mr-radius-sm);
		background: var(--Surface-Card);
		color: var(--Text-Primary);
		font-size: 14px;
	}
	.link-btn {
		background: none;
		border: none;
		color: var(--mr-color-brand);
		font-size: 13px;
		font-weight: 600;
		cursor: pointer;
		padding: 0;
	}
	.err {
		color: var(--mr-color-danger);
		font-size: 13px;
	}
	.empty {
		padding: 32px 20px;
		text-align: center;
		color: var(--Text-Secondary);
		font-size: 14px;
		background: var(--Surface-Card);
		border: 1px solid var(--Border-Subtle);
		border-radius: var(--mr-radius-md);
	}
	.policy-doc {
		font-size: 12px;
		color: var(--Text-Secondary);
		background: var(--Surface-Muted);
		border-radius: var(--mr-radius-sm);
		padding: 10px 12px;
		white-space: pre-wrap;
		word-break: break-word;
		max-height: 160px;
		overflow: auto;
		font-family: monospace;
	}
`;
