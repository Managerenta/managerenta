"use client";
import styled from "styled-components";
import { Box } from "@/components";

export const AddTransactionWrapperStyled = styled(Box)`
	display: flex;
	flex-direction: column;
	gap: 20px;
	width: 100%;
	padding: 15px;
	background: #f8fafc;

	.content-grid {
		display: grid;
		grid-template-columns: 2fr 1fr;
		gap: 24px;

		.left-column,
		.right-column {
			display: flex;
			flex-direction: column;
			gap: 24px;
		}
	}

	@media (max-width: 1024px) {
		.content-grid {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 767px) {
		padding: 12px;
		gap: 14px;

		.content-grid {
			gap: 14px;
		}
	}
`;
