"use client";
import styled from "styled-components";
import { Box } from "@/components";

export const TabSidebarStyled = styled(Box)`
	display: flex;
	flex-direction: column;
	width: 248px;
	height: 100%;
	background: var(--mr-color-page);
	border-right: 1px solid var(--mr-color-border);
	padding: 20px 14px;

	.brand-section {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-bottom: 24px;
		padding: 6px 8px;

		svg {
			font-size: 26px;
			color: var(--mr-color-brand);
		}

		.brand-name {
			font-size: var(--mr-fs-xl);
			font-weight: var(--mr-fw-bold);
			letter-spacing: -0.02em;
			color: var(--mr-color-text);
		}
	}

	.org-switcher {
		position: relative;
		margin-bottom: 20px;

		.org-trigger {
			display: flex;
			align-items: center;
			gap: 10px;
			padding: 10px 12px;
			border: 1px solid var(--mr-color-border);
			border-radius: var(--mr-radius-md);
			cursor: pointer;
			background: var(--mr-color-card);
			transition:
				border-color var(--mr-dur-fast) var(--mr-ease-out),
				box-shadow var(--mr-dur-fast) var(--mr-ease-out);

			&:hover {
				border-color: var(--mr-color-border-strong);
				box-shadow: var(--mr-shadow-xs);
			}

			.org-avatar {
				width: 32px;
				height: 32px;
				border-radius: var(--mr-radius-sm);
				background: var(--mr-color-brand);
				color: var(--mr-color-text-on-brand);
				font-size: 11px;
				font-weight: var(--mr-fw-bold);
				display: flex;
				align-items: center;
				justify-content: center;
				letter-spacing: 0.02em;
			}

			.org-label {
				flex: 1;
				display: flex;
				flex-direction: column;
				overflow: hidden;
				min-width: 0;
			}

			.org-name {
				font-size: var(--mr-fs-sm);
				font-weight: var(--mr-fw-semibold);
				color: var(--mr-color-text);
				white-space: nowrap;
				overflow: hidden;
				text-overflow: ellipsis;
				letter-spacing: -0.005em;
			}

			.org-role {
				font-size: 11px;
				color: var(--mr-color-text-subtle);
				text-transform: uppercase;
				letter-spacing: 0.04em;
			}
		}

		.org-menu {
			position: absolute;
			top: calc(100% + 6px);
			left: 0;
			right: 0;
			background: var(--mr-color-card);
			border: 1px solid var(--mr-color-border);
			border-radius: var(--mr-radius-md);
			padding: 6px;
			z-index: 50;
			box-shadow: var(--mr-shadow-lg);
			display: flex;
			flex-direction: column;
			gap: 2px;

			.org-menu-item {
				padding: 9px 10px;
				border-radius: var(--mr-radius-sm);
				font-size: var(--mr-fs-sm);
				color: var(--mr-color-text);
				cursor: pointer;
				display: flex;
				align-items: center;
				gap: 8px;
				transition: background var(--mr-dur-fast) var(--mr-ease-out);

				&:hover {
					background: var(--mr-color-muted);
				}

				&.active {
					background: var(--mr-color-brand-soft);
					color: var(--mr-color-brand);
					font-weight: var(--mr-fw-semibold);
				}

				&.create {
					color: var(--mr-color-brand);
					border-top: 1px solid var(--mr-color-border);
					margin-top: 4px;
					padding-top: 10px;
				}
			}
		}
	}

	.navigation-section {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 2px;

		.nav-item {
			text-decoration: none;
			border-radius: var(--mr-radius-md);
			transition:
				background var(--mr-dur-fast) var(--mr-ease-out),
				color var(--mr-dur-fast) var(--mr-ease-out);
			position: relative;

			&:hover {
				background: var(--mr-color-muted);
			}

			&.active {
				background: var(--mr-color-brand);
				box-shadow: var(--mr-shadow-sm);

				.nav-content {
					color: var(--mr-color-text-on-brand);
				}
			}

			.nav-content {
				display: flex;
				align-items: center;
				gap: 12px;
				padding: 10px 14px;
				color: var(--mr-color-text-muted);

				.nav-icon {
					display: flex;
					align-items: center;
					justify-content: center;
					flex-shrink: 0;
					font-size: 18px;
				}

				.nav-text {
					font-size: var(--mr-fs-md);
					font-weight: var(--mr-fw-medium);
					color: inherit;
					letter-spacing: -0.005em;
				}
			}
		}
	}

	@media (max-width: 767px) {
		display: none;
	}
`;
