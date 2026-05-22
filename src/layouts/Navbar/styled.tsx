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
	padding: 0 28px;
	border-bottom: 1px solid var(--mr-color-border);
	backdrop-filter: saturate(180%) blur(8px);

	.mobile-brand {
		display: none;
	}

	.nav-actions {
		display: flex;
		align-items: center;
		gap: 12px;

		.notification-bell {
			position: relative;
			cursor: pointer;
			display: flex;
			align-items: center;
			justify-content: center;
			color: var(--mr-color-text-muted);
			padding: 8px;
			border-radius: var(--mr-radius-sm);
			transition:
				background var(--mr-dur-fast) var(--mr-ease-out),
				color var(--mr-dur-fast) var(--mr-ease-out);
			user-select: none;

			&:hover,
			&:focus-visible {
				background: var(--mr-color-muted);
				color: var(--mr-color-brand);
				outline: none;
			}

			.badge {
				position: absolute;
				top: 2px;
				right: 2px;
				min-width: 18px;
				height: 18px;
				padding: 0 5px;
				border-radius: var(--mr-radius-pill);
				background: var(--mr-color-accent);
				color: var(--mr-color-text-on-accent);
				font-size: 10px;
				font-weight: var(--mr-fw-bold);
				display: flex;
				align-items: center;
				justify-content: center;
				box-shadow: 0 0 0 2px ${({ $background }) => $background};
			}

			.bell-dropdown {
				position: absolute;
				top: calc(100% + 10px);
				right: -8px;
				width: 380px;
				max-width: calc(100vw - 32px);
				background: var(--mr-color-card);
				border: 1px solid var(--mr-color-border);
				border-radius: var(--mr-radius-lg);
				box-shadow: var(--mr-shadow-xl);
				overflow: hidden;
				z-index: 200;
				cursor: default;
				display: flex;
				flex-direction: column;
				color: var(--mr-color-text);
				animation: bell-pop var(--mr-dur-base) var(--mr-ease-out);
			}

			@keyframes bell-pop {
				from {
					opacity: 0;
					transform: translateY(-6px) scale(0.98);
				}
				to {
					opacity: 1;
					transform: translateY(0) scale(1);
				}
			}

			.bell-header {
				display: flex;
				align-items: center;
				justify-content: space-between;
				padding: 16px 18px;
				border-bottom: 1px solid var(--mr-color-border);
				gap: 12px;
			}

			.bell-title {
				font-size: var(--mr-fs-md);
				font-weight: var(--mr-fw-semibold);
				letter-spacing: -0.01em;
				color: var(--mr-color-text);
			}

			.bell-subtitle {
				font-size: var(--mr-fs-xs);
				color: var(--mr-color-text-subtle);
				margin-top: 2px;
			}

			.bell-mark-all {
				display: inline-flex;
				align-items: center;
				gap: 4px;
				background: transparent;
				border: none;
				color: var(--mr-color-brand);
				font-size: var(--mr-fs-xs);
				font-weight: var(--mr-fw-semibold);
				cursor: pointer;
				padding: 6px 10px;
				border-radius: var(--mr-radius-sm);
				transition: background var(--mr-dur-fast) var(--mr-ease-out);

				&:hover {
					background: var(--mr-color-brand-soft);
				}
			}

			.bell-list {
				max-height: 380px;
				overflow-y: auto;
				display: flex;
				flex-direction: column;
			}

			.bell-empty {
				padding: 36px 20px;
				text-align: center;
				color: var(--mr-color-text-subtle);
				display: flex;
				flex-direction: column;
				align-items: center;
				gap: 8px;
				font-size: var(--mr-fs-sm);
			}

			.bell-row {
				display: flex;
				align-items: flex-start;
				gap: 12px;
				padding: 14px 18px;
				background: transparent;
				border: none;
				border-bottom: 1px solid var(--mr-color-border);
				text-align: left;
				cursor: pointer;
				transition: background var(--mr-dur-fast) var(--mr-ease-out);
				width: 100%;

				&:last-child {
					border-bottom: none;
				}

				&:hover {
					background: var(--mr-color-muted);
				}

				&.unread {
					background: var(--mr-color-brand-soft);

					&:hover {
						filter: brightness(0.97);
					}
				}
			}

			.bell-row-icon {
				width: 34px;
				height: 34px;
				border-radius: var(--mr-radius-sm);
				background: var(--mr-color-brand-soft);
				color: var(--mr-color-brand);
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
				font-size: var(--mr-fs-sm);
				font-weight: var(--mr-fw-semibold);
				color: var(--mr-color-text);
				white-space: nowrap;
				overflow: hidden;
				text-overflow: ellipsis;
			}

			.bell-row-body {
				font-size: var(--mr-fs-xs);
				color: var(--mr-color-text-muted);
				display: -webkit-box;
				-webkit-line-clamp: 2;
				-webkit-box-orient: vertical;
				overflow: hidden;
				line-height: var(--mr-lh-snug);
			}

			.bell-row-time {
				font-size: 11px;
				color: var(--mr-color-text-subtle);
				margin-top: 4px;
			}

			.bell-dot {
				width: 8px;
				height: 8px;
				border-radius: 50%;
				background: var(--mr-color-accent);
				margin-top: 10px;
				flex-shrink: 0;
			}

			.bell-view-all {
				background: transparent;
				border: none;
				border-top: 1px solid var(--mr-color-border);
				padding: 14px 16px;
				color: var(--mr-color-brand);
				font-size: var(--mr-fs-sm);
				font-weight: var(--mr-fw-semibold);
				cursor: pointer;
				text-align: center;
				width: 100%;
				transition: background var(--mr-dur-fast) var(--mr-ease-out);

				&:hover {
					background: var(--mr-color-muted);
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
			padding: 6px 8px 6px 6px;
			border-radius: var(--mr-radius-pill);
			transition: background var(--mr-dur-fast) var(--mr-ease-out);

			&:hover {
				background: var(--mr-color-muted);
			}

			.avatar {
				width: 32px;
				height: 32px;
				border-radius: 50%;
				background: var(--mr-color-brand);
				color: var(--mr-color-text-on-brand);
				display: flex;
				align-items: center;
				justify-content: center;
				font-size: var(--mr-fs-sm);
				font-weight: var(--mr-fw-semibold);
				flex-shrink: 0;
				overflow: hidden;
				box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.12);

				img {
					width: 100%;
					height: 100%;
					object-fit: cover;
				}
			}

			.user-name {
				font-size: var(--mr-fs-md);
				font-weight: var(--mr-fw-medium);
				color: var(--mr-color-text);
			}

			.chevron {
				color: var(--mr-color-text-muted);
				transition: transform var(--mr-dur-base) var(--mr-ease-out);
				&.open {
					transform: rotate(180deg);
				}
			}

			.user-dropdown {
				position: absolute;
				top: calc(100% + 6px);
				right: 0;
				min-width: 180px;
				background: var(--mr-color-card);
				border: 1px solid var(--mr-color-border);
				border-radius: var(--mr-radius-md);
				box-shadow: var(--mr-shadow-lg);
				overflow: hidden;
				z-index: 100;
				padding: 6px;
				animation: bell-pop var(--mr-dur-base) var(--mr-ease-out);

				button {
					width: 100%;
					display: flex;
					align-items: center;
					gap: 10px;
					padding: 10px 12px;
					background: none;
					border: none;
					cursor: pointer;
					font-size: var(--mr-fs-md);
					font-weight: var(--mr-fw-medium);
					color: var(--mr-color-danger);
					border-radius: var(--mr-radius-sm);
					transition: background var(--mr-dur-fast) var(--mr-ease-out);

					&:hover {
						background: var(--mr-color-danger-soft);
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
			gap: 8px;

			svg {
				font-size: 22px;
				color: var(--mr-color-brand);
			}

			.brand-name {
				font-size: var(--mr-fs-lg);
				font-weight: var(--mr-fw-bold);
				letter-spacing: -0.015em;
				color: var(--mr-color-text);
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
