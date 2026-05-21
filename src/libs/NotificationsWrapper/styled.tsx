"use client";
import styled from "styled-components";
import { Box } from "@/components";

export const NotificationsWrapperStyled = styled(Box)`
	display: flex;
	flex-direction: column;
	gap: 16px;
	padding: 24px;
	max-width: 880px;
	margin: 0 auto;

	.header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
	}

	.title {
		font-size: 22px;
		font-weight: 700;
		color: var(--Black);
	}

	.subtitle {
		font-size: 13px;
		color: #94a3b8;
	}

	.btn-inner {
		display: flex;
		align-items: center;
		gap: 6px;
		justify-content: center;
	}

	.list {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.row {
		display: flex;
		gap: 12px;
		padding: 14px;
		border-radius: 12px;
		background: var(--Surface-Card);
		border: 1px solid var(--Border-Subtle);
		cursor: pointer;

		&.unread {
			background: rgba(37, 99, 235, 0.04);
			border-color: rgba(37, 99, 235, 0.25);
		}

		&:hover {
			border-color: var(--Main-Blue);
		}
	}

	.row-icon {
		width: 36px;
		height: 36px;
		border-radius: 50%;
		background: var(--Surface-Page);
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--Main-Blue);
		flex-shrink: 0;
	}

	.row-text {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.row-title {
		font-size: 14px;
		font-weight: 600;
		color: var(--Black);
	}

	.row-body {
		font-size: 13px;
		color: #475569;
		line-height: 1.4;
	}

	.row-meta {
		font-size: 11px;
		color: #94a3b8;
		margin-top: 4px;
	}

	.row-status {
		align-self: flex-start;
		padding: 4px 8px;
		border-radius: 999px;
		font-size: 11px;
		font-weight: 600;
		text-transform: uppercase;

		&.status-queued {
			background: #fef3c7;
			color: #d97706;
		}

		&.status-sent {
			background: #dcfce7;
			color: #16a34a;
		}

		&.status-failed {
			background: #fee2e2;
			color: #ef4444;
		}

		&.status-read {
			background: var(--Surface-Page);
			color: #94a3b8;
		}
	}

	.empty {
		padding: 48px 24px;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
		color: #94a3b8;
		text-align: center;
	}

	.empty-title {
		font-size: 16px;
		font-weight: 600;
		color: var(--Black);
	}

	.empty-desc {
		font-size: 13px;
		color: #94a3b8;
	}
`;
