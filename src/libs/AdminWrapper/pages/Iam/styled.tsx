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

	/* ── Friendly policy builder ─────────────────────────────────────────── */
	.policy-builder {
		display: flex;
		flex-direction: column;
		gap: 14px;
		width: 100%;
	}
	.builder-grid {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.builder-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		flex-wrap: wrap;
		padding: 8px 10px;
		border: 1px solid var(--Border-Subtle);
		border-radius: var(--mr-radius-sm);
		background: var(--Surface-Card);
	}
	.builder-row .svc-label {
		font-size: 14px;
		font-weight: 600;
		color: var(--Text-Primary);
	}
	.segmented {
		display: inline-flex;
		border: 1px solid var(--Border-Subtle);
		border-radius: var(--mr-radius-sm);
		overflow: hidden;
	}
	.segmented .seg {
		padding: 7px 14px;
		font-size: 13px;
		font-weight: 600;
		background: var(--Surface-Card);
		color: var(--Text-Secondary);
		border: none;
		border-left: 1px solid var(--Border-Subtle);
		cursor: pointer;
		transition: all var(--mr-dur-fast);
	}
	.segmented .seg:first-child {
		border-left: none;
	}
	.segmented .seg:hover {
		color: var(--Text-Primary);
	}
	.segmented .seg.active.off {
		background: var(--mr-color-subtle);
		color: var(--Text-Primary);
	}
	.segmented .seg.active.read {
		background: var(--mr-color-brand-soft);
		color: var(--mr-color-brand);
	}
	.segmented .seg.active.full {
		background: var(--mr-color-brand);
		color: var(--mr-color-brand-on);
	}
	.advanced-wrap {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.advanced-body {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.advanced-body textarea {
		width: 100%;
		min-height: 200px;
		padding: 10px 14px;
		border: 1px solid var(--Border-Subtle);
		border-radius: var(--mr-radius-sm);
		background: var(--Surface-Card);
		color: var(--Text-Primary);
		font-size: 13px;
		font-family: monospace;
		resize: vertical;
	}
	.advanced-note {
		display: flex;
		align-items: center;
		gap: 12px;
		flex-wrap: wrap;
	}
`;
