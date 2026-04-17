"use client";
import styled from "styled-components";
import { Box } from "@/components";

export const TenantsWrapperStyled = styled(Box)`
	display: flex;
	flex-direction: column;
	gap: 24px;
	width: 100%;
	padding: 10px 5px;
	background: var(--Surface-Page);

	.pagination-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 16px 0;
		flex-wrap: wrap;
		gap: 16px;

		.items-per-page {
			display: flex;
			align-items: center;
			gap: 8px;
			font-size: 14px;
			color: #64748b;

			select {
				padding: 6px 10px;
				border: 1px solid var(--Border-Subtle);
				border-radius: 6px;
				font-size: 14px;
				color: var(--Black);
				background: var(--Surface-Card);
				cursor: pointer;
			}
		}

		.showing-info {
			font-size: 14px;
			color: #64748b;
		}
	}

	@media (max-width: 767px) {
		padding: 10px;
		gap: 14px;

		.pagination-footer {
			flex-direction: column;
			align-items: center;
		}
	}
`;
