"use client";
import styled from "styled-components";
import { Box } from "@/components";

export const NotificationsWrapperStyled = styled(Box)`
	display: flex;
	flex-direction: column;
	gap: 18px;
	padding: 24px;
	max-width: 920px;
	margin: 0 auto;

	.header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 16px;
	}

	.header-left {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.title-row {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.title {
		font-size: 24px;
		font-weight: 700;
		color: var(--Black);
		letter-spacing: -0.01em;
	}

	.unread-pill {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 22px;
		height: 22px;
		padding: 0 8px;
		border-radius: 999px;
		background: var(--Main-Blue);
		color: white;
		font-size: 12px;
		font-weight: 700;
	}

	.subtitle {
		font-size: 13px;
		color: #64748b;
	}

	.actions {
		display: flex;
		gap: 8px;
		flex-shrink: 0;
	}

	.btn-inner {
		display: flex;
		align-items: center;
		gap: 6px;
		justify-content: center;
	}

	.filters {
		display: flex;
		gap: 6px;
		flex-wrap: wrap;
		padding: 6px;
		background: var(--Surface-Card);
		border: 1px solid var(--Border-Subtle);
		border-radius: 12px;
		width: fit-content;
	}

	.filter-chip {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 8px 12px;
		background: transparent;
		border: none;
		border-radius: 8px;
		cursor: pointer;
		font-size: 13px;
		font-weight: 600;
		color: #64748b;
		transition:
			background 0.15s ease,
			color 0.15s ease;

		&:hover {
			background: var(--Surface-Page);
			color: var(--Black);
		}

		&.active {
			background: var(--Main-Blue);
			color: white;
		}
	}

	.filter-count {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 18px;
		padding: 0 6px;
		height: 18px;
		border-radius: 999px;
		background: rgba(15, 23, 42, 0.08);
		color: inherit;
		font-size: 11px;
		font-weight: 700;
	}

	.filter-chip.active .filter-count {
		background: rgba(255, 255, 255, 0.2);
		color: white;
	}

	.list {
		display: flex;
		flex-direction: column;
		gap: 18px;
	}

	.group {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.group-label {
		font-size: 12px;
		font-weight: 700;
		color: #94a3b8;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		padding: 0 4px;
	}

	.group-rows {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.row {
		display: flex;
		gap: 14px;
		padding: 14px 16px;
		border-radius: 12px;
		background: var(--Surface-Card);
		border: 1px solid var(--Border-Subtle);
		transition:
			border-color 0.15s ease,
			background 0.15s ease,
			transform 0.15s ease;
		position: relative;
	}

	.row.unread {
		background: rgba(37, 99, 235, 0.04);
		border-color: rgba(37, 99, 235, 0.22);
	}

	.row.unread::before {
		content: "";
		position: absolute;
		left: 6px;
		top: 50%;
		transform: translateY(-50%);
		width: 4px;
		height: 24px;
		border-radius: 4px;
		background: var(--Main-Blue);
	}

	.row:hover {
		border-color: var(--Main-Blue);
		transform: translateY(-1px);
	}

	.row-icon {
		width: 38px;
		height: 38px;
		border-radius: 10px;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		background: var(--Surface-Page);
		color: var(--Black);
	}

	.row-icon.tone-success {
		background: #dcfce7;
		color: #16a34a;
	}
	.row-icon.tone-warn {
		background: #fef3c7;
		color: #d97706;
	}
	.row-icon.tone-danger {
		background: #fee2e2;
		color: #ef4444;
	}
	.row-icon.tone-info {
		background: rgba(37, 99, 235, 0.1);
		color: var(--Main-Blue);
	}
	.row-icon.tone-neutral {
		background: var(--Surface-Page);
		color: #64748b;
	}

	.row-text {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 4px;
		min-width: 0;
	}

	.row-line {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
	}

	.row-title {
		font-size: 14px;
		font-weight: 600;
		color: var(--Black);
	}

	.kind-pill {
		font-size: 10px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		padding: 2px 8px;
		border-radius: 999px;
	}

	.kind-pill.tone-success {
		background: #dcfce7;
		color: #15803d;
	}
	.kind-pill.tone-warn {
		background: #fef3c7;
		color: #b45309;
	}
	.kind-pill.tone-danger {
		background: #fee2e2;
		color: #b91c1c;
	}
	.kind-pill.tone-info {
		background: rgba(37, 99, 235, 0.1);
		color: var(--Main-Blue);
	}
	.kind-pill.tone-neutral {
		background: var(--Surface-Page);
		color: #475569;
	}

	.row-body {
		font-size: 13px;
		color: #475569;
		line-height: 1.5;
		word-break: break-word;
	}

	.row-meta {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 11px;
		color: #94a3b8;
		margin-top: 2px;
		flex-wrap: wrap;
	}

	.row-meta .dot {
		color: #cbd5e1;
	}

	.row-actions {
		display: flex;
		align-items: center;
		gap: 4px;
		opacity: 0;
		transition: opacity 0.15s ease;
		flex-shrink: 0;
	}

	.row:hover .row-actions,
	.row:focus-within .row-actions {
		opacity: 1;
	}

	.row-action {
		width: 30px;
		height: 30px;
		border-radius: 8px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: transparent;
		border: none;
		cursor: pointer;
		color: #64748b;
		transition:
			background 0.15s ease,
			color 0.15s ease;
	}

	.row-action:hover {
		background: var(--Surface-Page);
		color: var(--Main-Blue);
	}

	.row-action.danger:hover {
		background: #fee2e2;
		color: #ef4444;
	}

	.empty {
		padding: 56px 24px;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 10px;
		color: #94a3b8;
		text-align: center;
		border: 1px dashed var(--Border-Subtle);
		border-radius: 12px;
		background: var(--Surface-Card);
	}

	.empty-title {
		font-size: 16px;
		font-weight: 600;
		color: var(--Black);
	}

	.empty-desc {
		font-size: 13px;
		color: #94a3b8;
		max-width: 360px;
	}

	@media (max-width: 640px) {
		padding: 16px;

		.header {
			flex-direction: column;
			align-items: stretch;
		}

		.row-actions {
			opacity: 1;
		}
	}
`;
