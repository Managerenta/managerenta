"use client";
import styled from "styled-components";
import { Box } from "@/components";

export const AdminShellStyled = styled(Box)`
	display: grid;
	grid-template-columns: 248px 1fr;
	min-height: 100vh;
	background: var(--Surface-Page);

	.admin-sidebar {
		border-right: 1px solid var(--Border-Subtle);
		background: var(--Surface-Card);
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding: 20px 14px;
		position: sticky;
		top: 0;
		height: 100vh;
		overflow-y: auto;
	}
	.admin-brand {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 6px 10px 14px;
		border-bottom: 1px solid var(--Border-Subtle);
		margin-bottom: 8px;
	}
	.admin-brand .brand-badge {
		width: 34px;
		height: 34px;
		border-radius: var(--mr-radius-sm);
		display: inline-flex;
		align-items: center;
		justify-content: center;
		background: var(--mr-color-brand);
		color: var(--White);
	}
	.admin-brand .brand-title {
		font-size: 15px;
		font-weight: 700;
		color: var(--Black);
		line-height: 1.1;
	}
	.admin-brand .brand-sub {
		font-size: 11px;
		color: var(--Text-Secondary);
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}

	.nav-item {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 10px 12px;
		border-radius: var(--mr-radius-sm);
		color: var(--Text-Secondary);
		font-size: 14px;
		font-weight: 500;
		text-decoration: none;
		transition: all var(--mr-dur-fast);
	}
	.nav-item:hover {
		background: var(--mr-color-subtle);
		color: var(--Text-Primary);
	}
	.nav-item.active {
		background: var(--mr-color-brand-soft);
		color: var(--mr-color-brand);
		font-weight: 600;
	}
	.nav-item .nav-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
	}

	.nav-spacer {
		flex: 1;
	}
	.back-link {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 10px 12px;
		border-radius: var(--mr-radius-sm);
		color: var(--Text-Secondary);
		font-size: 13px;
		text-decoration: none;
		border: none;
		border-top: 1px solid var(--Border-Subtle);
		margin-top: 8px;
		width: 100%;
		background: transparent;
		cursor: pointer;
		font-family: inherit;
		text-align: left;
	}
	.back-link:hover {
		color: var(--Text-Primary);
	}

	.admin-main {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}
	.admin-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: 16px 24px;
		border-bottom: 1px solid var(--Border-Subtle);
		background: var(--Surface-Card);
		position: sticky;
		top: 0;
		z-index: 5;
	}
	.admin-header .header-title {
		font-size: 16px;
		font-weight: 700;
		color: var(--Black);
	}
	.admin-header .header-pill {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 4px 10px;
		border-radius: var(--mr-radius-pill);
		background: var(--mr-color-brand-soft);
		color: var(--mr-color-brand);
		font-size: 12px;
		font-weight: 600;
	}
	.admin-content {
		padding: 20px 24px 48px;
		min-width: 0;
	}

	.shell-loader {
		grid-column: 1 / -1;
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 100vh;
	}

	@media (max-width: 860px) {
		grid-template-columns: 1fr;
		.admin-sidebar {
			position: static;
			height: auto;
			flex-direction: row;
			flex-wrap: wrap;
			overflow-x: auto;
		}
		.admin-brand {
			flex-basis: 100%;
		}
		.nav-spacer {
			display: none;
		}
		.back-link {
			border-top: none;
			margin-top: 0;
		}
	}
`;
