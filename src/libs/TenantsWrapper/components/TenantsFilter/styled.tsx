"use client";
import styled from "styled-components";
import { Box } from "@/components";

export const TenantsFilterStyled = styled(Box)`
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 16px;
	flex-wrap: wrap;

	.left-filters {
		display: flex;
		align-items: center;
		gap: 12px;
		flex: 1;

		.filter-dropdown {
			padding: 10px 14px;
			border: 1px solid var(--Border-Subtle);
			border-radius: 8px;
			font-size: 14px;
			color: var(--Black);
			background: var(--Surface-Card);
			cursor: pointer;
			min-width: 160px;
		}

		.search-bar {
			position: relative;
			flex: 1;
			min-width: 200px;

			svg {
				position: absolute;
				left: 12px;
				top: 50%;
				transform: translateY(-50%);
				color: #94a3b8;
			}

			input {
				width: 100%;
				padding: 10px 14px 10px 36px;
				border: 1px solid var(--Border-Subtle);
				border-radius: 8px;
				font-size: 14px;
				color: var(--Black);

				&::placeholder {
					color: #94a3b8;
				}
			}
		}
	}

	.right-filters {
		display: flex;
		align-items: center;
		gap: 12px;

		.sort-dropdown {
			padding: 10px 14px;
			border: 1px solid var(--Border-Subtle);
			border-radius: 8px;
			font-size: 14px;
			color: var(--Black);
			background: var(--Surface-Card);
			cursor: pointer;
		}

		.view-toggle {
			display: flex;
			border: 1px solid var(--Border-Subtle);
			border-radius: 8px;
			overflow: hidden;

			.toggle-btn {
				button {
					width: 40px;
					height: 40px;
					border: none;
					background: var(--Surface-Card);
					color: #94a3b8;
					cursor: pointer;
					display: flex;
					align-items: center;
					justify-content: center;
					border-radius: 0;
				}

				&.active button {
					background: var(--Main-Blue);
					color: white;
				}

				&:first-child {
					border-right: 1px solid var(--Border-Subtle);
				}
			}
		}
	}

	@media (max-width: 767px) {
		flex-direction: column;
		align-items: stretch;

		.left-filters {
			flex-direction: column;

			.filter-dropdown {
				width: 100%;
			}

			.search-bar {
				width: 100%;
			}
		}

		.right-filters {
			justify-content: space-between;

			.sort-dropdown {
				flex: 1;
			}
		}
	}
`;
