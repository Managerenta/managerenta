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
		height: 68px;
		background: var(--mr-color-card);
		border-top: 1px solid var(--mr-color-border);
		align-items: center;
		justify-content: space-around;
		z-index: 100;
		padding: 6px 8px;
		padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 6px);
		box-shadow: 0 -4px 12px rgba(30, 24, 12, 0.04);
		backdrop-filter: saturate(180%) blur(8px);

		.tab-item {
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: center;
			gap: 4px;
			text-decoration: none;
			padding: 8px 10px;
			border-radius: var(--mr-radius-md);
			transition:
				background var(--mr-dur-fast) var(--mr-ease-out),
				color var(--mr-dur-fast) var(--mr-ease-out);
			flex: 1;
			max-width: 84px;

			.tab-icon {
				display: flex;
				align-items: center;
				justify-content: center;
				color: var(--mr-color-text-subtle);
				transition: color var(--mr-dur-fast) var(--mr-ease-out);
				font-size: 20px;
			}

			.tab-label {
				font-size: 11px;
				font-weight: var(--mr-fw-medium);
				color: var(--mr-color-text-subtle);
				letter-spacing: -0.005em;
				transition: color var(--mr-dur-fast) var(--mr-ease-out);
			}

			&:active {
				background: var(--mr-color-muted);
			}

			&.active {
				.tab-icon {
					color: var(--mr-color-brand);
				}
				.tab-label {
					color: var(--mr-color-brand);
					font-weight: var(--mr-fw-semibold);
				}
			}
		}
	}
`;
