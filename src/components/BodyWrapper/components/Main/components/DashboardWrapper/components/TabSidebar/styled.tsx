"use client";
import styled from "styled-components";
import { Box } from "@/components";

export const TabSidebarStyled = styled(Box)`
	display: flex;
	flex-direction: column;
	width: 240px;
	height: 100%;
	background: var(--Main-White, #fff);
	border-right: 1px solid var(--Border-Subtle);
	padding: 24px 16px;

	.brand-section {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 32px;
		padding: 0 8px;

		svg {
			font-size: 28px;
			color: var(--Main-Blue);
		}

		.brand-name {
			font-size: 20px;
			font-weight: 700;
			color: var(--Black);
		}
	}

	.org-switcher {
		position: relative;
		margin-bottom: 16px;

		.org-trigger {
			display: flex;
			align-items: center;
			gap: 10px;
			padding: 8px 10px;
			border: 1px solid var(--Border-Subtle);
			border-radius: 10px;
			cursor: pointer;
			background: var(--Surface-Page);

			.org-avatar {
				width: 32px;
				height: 32px;
				border-radius: 50%;
				background: var(--Main-Blue);
				color: #fff;
				font-size: 11px;
				font-weight: 700;
				display: flex;
				align-items: center;
				justify-content: center;
			}

			.org-label {
				flex: 1;
				display: flex;
				flex-direction: column;
				overflow: hidden;
			}

			.org-name {
				font-size: 13px;
				font-weight: 600;
				color: var(--Black);
				white-space: nowrap;
				overflow: hidden;
				text-overflow: ellipsis;
			}

			.org-role {
				font-size: 11px;
				color: #94a3b8;
			}
		}

		.org-menu {
			position: absolute;
			top: calc(100% + 4px);
			left: 0;
			right: 0;
			background: var(--Surface-Card);
			border: 1px solid var(--Border-Subtle);
			border-radius: 10px;
			padding: 6px;
			z-index: 50;
			box-shadow: 0 6px 24px rgba(0, 0, 0, 0.08);
			display: flex;
			flex-direction: column;
			gap: 2px;

			.org-menu-item {
				padding: 8px 10px;
				border-radius: 6px;
				font-size: 13px;
				color: var(--Black);
				cursor: pointer;
				display: flex;
				align-items: center;
				gap: 6px;

				&:hover {
					background: var(--Surface-Page);
				}

				&.active {
					background: rgba(37, 99, 235, 0.1);
					color: var(--Main-Blue);
					font-weight: 600;
				}

				&.create {
					color: var(--Main-Blue);
					border-top: 1px solid var(--Border-Subtle);
					margin-top: 4px;
					padding-top: 8px;
				}
			}
		}
	}

	.navigation-section {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 4px;

		.nav-item {
			text-decoration: none;
			border-radius: 10px;
			transition: all 0.2s ease;

			&:hover {
				background: #f1f5f9;
			}

			&.active {
				background: var(--Main-Blue);
				.nav-content {
					color: white;
				}
			}

			.nav-content {
				display: flex;
				align-items: center;
				gap: 12px;
				padding: 12px 16px;
				color: #64748b;

				.nav-icon {
					display: flex;
					align-items: center;
					justify-content: center;
					flex-shrink: 0;
				}

				.nav-text {
					font-size: 15px;
					font-weight: 500;
					color: inherit;
				}
			}
		}
	}

	/* MOBILE: becomes bottom tab bar */
	@media (max-width: 767px) {
		display: none;
	}
`;
