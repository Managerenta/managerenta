"use client";
import styled from "styled-components";
import { Box } from "@/components";

export const TabSidebarStyled = styled(Box)`
	display: flex;
	flex-direction: column;
	width: 240px;
	height: 100%;
	background: var(--Main-White, #fff);
	border-right: 1px solid #e2e8f0;
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
