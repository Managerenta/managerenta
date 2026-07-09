"use client";
import styled from "styled-components";
import { Box } from "@/components";

export const UsersStyled = styled(Box)`
	display: flex;
	flex-direction: column;
	gap: 20px;
	width: 100%;
	padding: 10px 5px 40px;
	background: var(--Surface-Page);

	.page-head .title {
		font-size: 24px;
		font-weight: 700;
		color: var(--Black);
	}
	.page-head .subtitle {
		font-size: 14px;
		color: var(--Text-Secondary);
		margin-top: 4px;
	}

	.toolbar {
		display: flex;
		align-items: center;
		gap: 12px;
		flex-wrap: wrap;
		background: var(--Surface-Card);
		border: 1px solid var(--Border-Subtle);
		border-radius: var(--mr-radius-md);
		padding: 12px;
	}
	.toolbar .search {
		flex: 1 1 240px;
		min-width: 200px;
		height: 44px;
		padding: 0 14px;
		border: 1px solid var(--Border-Subtle);
		border-radius: var(--mr-radius-sm);
		background: var(--Surface-Card);
		color: var(--Text-Primary);
		font-size: 14px;
	}

	.cards {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	.user-card {
		background: var(--Surface-Card);
		border: 1px solid var(--Border-Subtle);
		border-radius: var(--mr-radius-md);
		padding: 16px;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	.card-top {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 12px;
		flex-wrap: wrap;
	}
	.card-name {
		font-size: 15px;
		font-weight: 700;
		color: var(--Black);
	}
	.card-meta {
		font-size: 12px;
		color: var(--Text-Secondary);
		margin-top: 2px;
	}
	.card-actions {
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
	.inline-form .grow {
		flex: 1 1 240px;
		min-width: 200px;
	}
	.link-btn {
		background: none;
		border: none;
		color: var(--mr-color-brand);
		font-size: 13px;
		font-weight: 600;
		cursor: pointer;
		padding: 0;
		display: inline-flex;
		align-items: center;
		gap: 4px;
	}
	.link-btn.danger {
		color: var(--mr-color-danger);
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
`;
