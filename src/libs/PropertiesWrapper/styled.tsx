"use client";
import styled from "styled-components";
import { Box } from "@/components";

export const PropertiesWrapperStyled = styled(Box)`
	display: flex;
	flex-direction: column;
	gap: 20px;
	width: 100%;
	padding: 10px 5px;
	background: var(--Surface-Page);

	.pagination-footer {
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 16px;

		.items-per-page {
			display: flex;
			align-items: center;
			gap: 8px;
			font-size: 14px;
			color: #64748b;

			.page-size {
				width: 96px;
			}
		}

		.showing-info {
			font-size: 14px;
			color: #64748b;
		}
	}

	@media (max-width: 767px) {
		display: flex;
		flex-direction: column;
		padding: 10px 5px;
		gap: 10px;

		.pagination-footer {
			flex-direction: column;
			align-items: center;
			gap: 12px;
		}
	}
`;
