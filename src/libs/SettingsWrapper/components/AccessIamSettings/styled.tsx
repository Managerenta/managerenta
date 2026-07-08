"use client";
import styled from "styled-components";
import { Box } from "@/components";

export const AccessIamSettingsStyled = styled(Box)`
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
		gap: 12px;
	}

	.section-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
	}

	.section-title {
		font-size: 16px;
		font-weight: 700;
		color: var(--Text-Primary);
	}

	.caption {
		font-size: 12px;
		color: var(--mr-color-text-subtle, #94a3b8);
		line-height: 1.5;
	}

	.notice {
		background: var(--Surface-Page);
		border: 1px solid var(--Border-Subtle);
		border-radius: 10px;
		padding: 18px 20px;
		display: flex;
		align-items: center;
		gap: 12px;
		color: var(--Text-Primary);
		font-size: 14px;

		svg {
			flex: 0 0 auto;
			color: var(--Error-600, #dc2626);
		}
	}

	.badge {
		display: inline-flex;
		align-items: center;
		font-size: 11px;
		font-weight: 600;
		padding: 2px 8px;
		border-radius: 999px;
		text-transform: capitalize;
		letter-spacing: 0.2px;
	}

	.badge.system {
		background: rgba(37, 99, 235, 0.1);
		color: var(--Main-Blue);
	}

	.badge.customer {
		background: rgba(16, 185, 129, 0.12);
		color: #059669;
	}

	/* ---- Member -> Group matrix ---- */
	.matrix-scroll {
		overflow-x: auto;
	}

	.matrix {
		border-collapse: collapse;
		width: 100%;
		min-width: 520px;
		font-size: 13px;
	}

	.matrix th,
	.matrix td {
		border-bottom: 1px solid var(--Border-Subtle);
		padding: 10px 12px;
		text-align: center;
		white-space: nowrap;
	}

	.matrix th.member-col,
	.matrix td.member-col {
		text-align: left;
		position: sticky;
		left: 0;
		background: var(--Surface-Card);
		z-index: 1;
	}

	.matrix thead th {
		color: var(--mr-color-text-subtle, #64748b);
		font-weight: 600;
		font-size: 12px;
		vertical-align: bottom;
	}

	.matrix .group-head {
		display: inline-flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
	}

	.matrix .group-head .group-name {
		font-weight: 700;
		color: var(--Text-Primary);
	}

	.matrix .member-name {
		font-size: 14px;
		font-weight: 600;
		color: var(--Text-Primary);
	}

	.matrix .member-email {
		font-size: 12px;
		color: var(--mr-color-text-subtle, #94a3b8);
	}

	.matrix input[type="checkbox"] {
		width: 18px;
		height: 18px;
		cursor: pointer;
		accent-color: var(--Main-Blue);
	}

	.btn-inner {
		display: flex;
		align-items: center;
		gap: 6px;
		justify-content: center;
	}

	/* ---- Rows (groups / policies lists) ---- */
	.list {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.row-wrap {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.row {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 12px 14px;
		background: var(--Surface-Page);
		border-radius: 8px;
	}

	.row .row-main {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.row .row-title {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 14px;
		font-weight: 600;
		color: var(--Text-Primary);
	}

	.row .row-sub {
		font-size: 12px;
		color: var(--mr-color-text-subtle, #94a3b8);
	}

	.row .row-actions {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.icon-btn {
		width: 30px;
		height: 30px;
		border-radius: 6px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		border: 1px solid var(--Border-Subtle);
		background: var(--Surface-Card);
		color: var(--Text-Primary);

		&:hover {
			border-color: var(--Main-Blue);
			color: var(--Main-Blue);
		}

		&.danger:hover {
			border-color: var(--Error-600, #dc2626);
			color: var(--Error-600, #dc2626);
			background: #fef2f2;
		}

		&.disabled {
			opacity: 0.4;
			cursor: not-allowed;
			pointer-events: none;
		}
	}

	.form-row {
		display: flex;
		gap: 8px;
		align-items: center;
		flex-wrap: wrap;

		input {
			flex: 1;
			min-width: 200px;
			padding: 10px 14px;
			border: 1px solid var(--Border-Subtle);
			border-radius: 8px;
			font-size: 14px;
			color: var(--Text-Primary);
			background: var(--Surface-Page);
		}
	}

	.editor {
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding: 14px;
		background: var(--Surface-Page);
		border-radius: 8px;
		border: 1px solid var(--Border-Subtle);
	}

	.editor .multi-select {
		width: 100%;
	}

	textarea.json {
		width: 100%;
		min-height: 180px;
		padding: 12px 14px;
		border: 1px solid var(--Border-Subtle);
		border-radius: 8px;
		font-family: var(--mr-font-mono, ui-monospace, monospace);
		font-size: 13px;
		line-height: 1.5;
		color: var(--Text-Primary);
		background: var(--Surface-Card);
		resize: vertical;
	}

	.error-text {
		font-size: 12px;
		color: var(--Error-600, #dc2626);
	}

	.empty {
		font-size: 13px;
		color: var(--mr-color-text-subtle, #94a3b8);
		padding: 8px 0;
	}

	.editor-actions {
		display: flex;
		gap: 8px;
		align-items: center;
	}

	@media (max-width: 640px) {
		.form-row input {
			min-width: 100%;
		}
	}
`;
