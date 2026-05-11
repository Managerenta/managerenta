"use client";
import styled from "styled-components";
import { Box } from "@/components";

export const MobileTabBarStyled = styled(Box)`
	display: none;

	@media (max-width: 767px) {
		display: flex;
		position: fixed;
		bottom: 0;
		left: 0;
		width: 100%;
		height: 70px;
		background: var(--Main-White, #fff);
		border-top: 1px solid var(--Border-Subtle);
		align-items: center;
		justify-content: space-around;
		z-index: 100;
		padding: 0 8px;
		padding-bottom: env(safe-area-inset-bottom, 0px);

		.tab-item {
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: center;
			gap: 4px;
			text-decoration: none;
			padding: 8px 12px;
			border-radius: 8px;
			transition: all 0.2s ease;
			flex: 1;

			.tab-icon {
				display: flex;
				align-items: center;
				justify-content: center;
				color: #94a3b8;
			}

			.tab-label {
				font-size: 12px;
				font-weight: 500;
				color: #94a3b8;
			}

			&.active {
				.tab-icon {
					color: var(--Black);
				}
				.tab-label {
					color: var(--Black);
					font-weight: 600;
				}
			}
		}
	}
`;
