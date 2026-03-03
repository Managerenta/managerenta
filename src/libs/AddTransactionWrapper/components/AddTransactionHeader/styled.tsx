"use client";
import styled from "styled-components";
import { Box } from "@/components";

export const AddTransactionHeaderStyled = styled(Box)`
	display: flex;
	flex-direction: column;
	gap: 16px;

	.breadcrumb {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 14px;
		flex-wrap: wrap;

		a {
			color: #3b82f6;
			text-decoration: none;
			&:hover {
				text-decoration: underline;
			}
		}

		.separator {
			color: #94a3b8;
		}

		.breadcrumb-text {
			color: #3b82f6;
			cursor: pointer;
			&:hover {
				text-decoration: underline;
			}
		}

		.current {
			color: #64748b;
		}
	}

	.title-row {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;

		.title-section {
			display: flex;
			flex-direction: column;
			gap: 4px;

			.page-title {
				font-size: 24px;
				font-weight: 700;
				color: var(--Black);
			}

			.page-subtitle {
				font-size: 14px;
				color: #64748b;
			}
		}

		.close-btn button {
			width: 40px;
			height: 40px;
			display: flex;
			align-items: center;
			justify-content: center;
			border: none;

			&:hover {
				background: #f1f5f9;
			}
		}
	}

	@media (max-width: 767px) {
		.breadcrumb {
			display: none;
		}

		.title-row .title-section .page-title {
			font-size: 20px;
		}
	}
`;
