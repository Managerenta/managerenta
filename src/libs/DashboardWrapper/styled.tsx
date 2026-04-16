"use client";
import styled from "styled-components";
import { Box } from "@/components";

export const DashboardWrapperStyled = styled(Box)`
	display: flex;
	flex-direction: column;
	gap: 24px;
	width: 100%;
	padding: 10px 5px;
	background: var(--Surface-Page);

	.bottom-grid {
		display: grid;
		grid-template-columns: 2fr 1fr;
		gap: 24px;

		.left-grid,
		.right-grid {
			display: flex;
			flex-direction: column;
			gap: 24px;
		}
	}

	@media (max-width: 1024px) {
		.bottom-grid {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 767px) {
		display: flex;
		flex-direction: column;
		padding: 10px 5px;
		gap: 10px;
	}
`;
