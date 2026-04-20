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

			.badge {
				position: absolute;
				top: -6px;
				right: -8px;
				width: 18px;
				height: 18px;
				border-radius: 50%;
				background: #ef4444;
				color: white;
				font-size: 11px;
				font-weight: 600;
				display: flex;
				align-items: center;
				justify-content: center;
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
				width: 40px;
				height: 40px;
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
		}
	}
`;
