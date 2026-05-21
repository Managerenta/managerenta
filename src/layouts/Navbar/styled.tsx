"use client";
import styled from "styled-components";
import { Box } from "@/components";

export const NavbarStyled = styled(Box)<{
	$navHeight: string;
	$background: string;
}>`
	width: 100%;
	height: ${({ $navHeight }) => $navHeight};
	background: ${({ $background }) => $background};
	display: flex;
	align-items: center;
	justify-content: flex-end;
	padding: 0 24px;
	border-bottom: 1px solid var(--Border-Subtle);

	.mobile-brand {
		display: none;
	}

	.nav-actions {
		display: flex;
		align-items: center;
		gap: 20px;

		.notification-bell {
			position: relative;
			cursor: pointer;
			display: flex;
			align-items: center;
			justify-content: center;
			color: #64748b;
			padding: 6px;
			border-radius: 8px;
			transition:
				background 0.15s ease,
				color 0.15s ease;
			user-select: none;

			&:hover,
			&:focus-visible {
				background: var(--Surface-Page);
				color: var(--Main-Blue);
				outline: none;
			}

			.badge {
				position: absolute;
				top: -2px;
				right: -2px;
				min-width: 18px;
				height: 18px;
				padding: 0 5px;
				border-radius: 999px;
				background: #ef4444;
				color: white;
				font-size: 10px;
				font-weight: 700;
				display: flex;
				align-items: center;
				justify-content: center;
				box-shadow: 0 0 0 2px var(--Main-White, #fff);
			}

			.bell-dropdown {
				position: absolute;
				top: calc(100% + 8px);
				right: -8px;
				width: 360px;
				max-width: calc(100vw - 32px);
				background: var(--Surface-Card);
				border: 1px solid var(--Border-Subtle);
				border-radius: 12px;
				box-shadow: 0 12px 36px rgba(15, 23, 42, 0.12);
				overflow: hidden;
				z-index: 200;
				cursor: default;
				display: flex;
				flex-direction: column;
				color: var(--Black);
			}

			.bell-header {
				display: flex;
				align-items: center;
				justify-content: space-between;
				padding: 14px 16px;
				border-bottom: 1px solid var(--Border-Subtle);
				gap: 12px;
			}

			.bell-title {
				font-size: 14px;
				font-weight: 700;
				color: var(--Black);
			}

			.bell-subtitle {
				font-size: 12px;
				color: #94a3b8;
				margin-top: 2px;
			}

			.bell-mark-all {
				display: inline-flex;
				align-items: center;
				gap: 4px;
				background: transparent;
				border: none;
				color: var(--Main-Blue);
				font-size: 12px;
				font-weight: 600;
				cursor: pointer;
				padding: 4px 6px;
				border-radius: 6px;

				&:hover {
					background: rgba(37, 99, 235, 0.08);
				}
			}

			.bell-list {
				max-height: 360px;
				overflow-y: auto;
				display: flex;
				flex-direction: column;
			}

			.bell-empty {
				padding: 32px 20px;
				text-align: center;
				color: #94a3b8;
				display: flex;
				flex-direction: column;
				align-items: center;
				gap: 8px;
				font-size: 13px;
			}

			.bell-row {
				display: flex;
				align-items: flex-start;
				gap: 10px;
				padding: 12px 16px;
				background: transparent;
				border: none;
				border-bottom: 1px solid var(--Border-Subtle);
				text-align: left;
				cursor: pointer;
				transition: background 0.12s ease;
				width: 100%;

				&:last-child {
					border-bottom: none;
				}

				&:hover {
					background: var(--Surface-Page);
				}

				&.unread {
					background: rgba(37, 99, 235, 0.04);

					&:hover {
						background: rgba(37, 99, 235, 0.08);
					}
				}
			}

			.bell-row-icon {
				width: 30px;
				height: 30px;
				border-radius: 8px;
				background: var(--Surface-Page);
				color: var(--Main-Blue);
				display: flex;
				align-items: center;
				justify-content: center;
				flex-shrink: 0;
			}

			.bell-row-text {
				flex: 1;
				display: flex;
				flex-direction: column;
				gap: 2px;
				min-width: 0;
			}

			.bell-row-title {
				font-size: 13px;
				font-weight: 600;
				color: var(--Black);
				white-space: nowrap;
				overflow: hidden;
				text-overflow: ellipsis;
			}

			.bell-row-body {
				font-size: 12px;
				color: #475569;
				display: -webkit-box;
				-webkit-line-clamp: 2;
				-webkit-box-orient: vertical;
				overflow: hidden;
			}

			.bell-row-time {
				font-size: 11px;
				color: #94a3b8;
				margin-top: 2px;
			}

			.bell-dot {
				width: 8px;
				height: 8px;
				border-radius: 50%;
				background: var(--Main-Blue);
				margin-top: 8px;
				flex-shrink: 0;
			}

			.bell-view-all {
				background: transparent;
				border: none;
				border-top: 1px solid var(--Border-Subtle);
				padding: 12px 16px;
				color: var(--Main-Blue);
				font-size: 13px;
				font-weight: 600;
				cursor: pointer;
				text-align: center;
				width: 100%;

				&:hover {
					background: var(--Surface-Page);
				}
			}
		}

		.user-profile {
			display: flex;
			align-items: center;
			gap: 10px;
			cursor: pointer;
			position: relative;
			user-select: none;

			.avatar {
				width: 34px;
				height: 34px;
				border-radius: 50%;
				background: var(--Main-Blue);
				color: white;
				display: flex;
				align-items: center;
				justify-content: center;
				font-size: 13px;
				font-weight: 600;
				flex-shrink: 0;
				overflow: hidden;

				img {
					width: 100%;
					height: 100%;
					object-fit: cover;
				}
			}

			.user-name {
				font-size: 14px;
				font-weight: 500;
				color: var(--Black);
			}

			.chevron {
				color: #64748b;
				transition: transform 0.2s ease;
				&.open {
					transform: rotate(180deg);
				}
			}

			.user-dropdown {
				position: absolute;
				top: calc(100% + 3px);
				right: 0;
				min-width: 140px;
				background: var(--Surface-Card);
				border: 1px solid var(--Border-Subtle);
				border-radius: 8px;
				box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
				overflow: hidden;
				z-index: 100;

				button {
					width: 100%;
					display: flex;
					align-items: center;
					gap: 8px;
					padding: 10px 14px;
					background: none;
					border: none;
					cursor: pointer;
					font-size: 14px;
					font-weight: 500;
					color: #ef4444;
					transition: background 0.15s ease;

					&:hover {
						background: rgba(239, 68, 68, 0.08);
					}
				}
			}
		}
	}

	@media (max-width: 767px) {
		padding: 0 16px;

		.mobile-brand {
			display: flex;
			align-items: center;
			gap: 6px;

			svg {
				font-size: 24px;
				color: var(--Main-Blue);
			}

			.brand-name {
				font-size: 18px;
				font-weight: 700;
				color: var(--Black);
			}
		}

		.nav-actions {
			.user-profile {
				display: none;
			}

			.notification-bell .bell-dropdown {
				right: -16px;
				width: 320px;
			}
		}
	}
`;
