"use client";
import styled from "styled-components";
import { Box } from "@/components";

export const DashboardWrapperStyled = styled(Box)<{
	$navHeight: string;
}>`
	display: flex;
	width: 100%;
	min-height: 100vh;

	.sidebar {
		flex-shrink: 0;
		position: sticky;
		top: 0;
		height: 100vh;
		overflow-y: auto;
	}

	.right-section {
		flex: 1;
		display: flex;
		flex-direction: column;
		min-width: 0;

		.main-content {
			flex: 1;
			padding: 20px;
			background: var(--Surface-Page);
			overflow-y: auto;
		}
	}

	@media (max-width: 767px) {
		.sidebar {
			display: none;
		}

		.right-section {
			width: 100%;

			.main-content {
				padding: 16px;
				padding-bottom: 90px;
			}
		}
	}
`;
