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
	justify-content: space-between;
	padding: 0 24px;
	border-bottom: 1px solid #e2e8f0;

	.mobile-brand {
		display: none;
	}

	.search-bar {
		flex: 1;
		max-width: 500px;
		position: relative;

		svg {
			position: absolute;
			left: 12px;
			top: 50%;
			transform: translateY(-50%);
			color: #94a3b8;
		}

		input {
			width: 100%;
			padding: 10px 16px 10px 40px;
			border: 1px solid #e2e8f0;
			border-radius: 8px;
			font-size: 14px;
			background: #f8fafc;
			color: var(--Black);

			&::placeholder {
				color: #94a3b8;
			}
		}
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

			.avatar {
				width: 36px;
				height: 36px;
				border-radius: 50%;
				background: var(--Main-Blue);
				color: white;
				display: flex;
				align-items: center;
				justify-content: center;
				font-size: 13px;
				font-weight: 600;
			}

			.user-name {
				font-size: 14px;
				font-weight: 500;
				color: var(--Black);
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

		.search-bar {
			display: none;
		}

		.nav-actions {
			.user-profile {
				display: none;
			}
		}
	}
`;
