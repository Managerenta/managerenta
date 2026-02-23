"use client";
import styled from "styled-components";
import { Box } from "@/components";

export const PaginationStyled = styled(Box)`
	width: auto;
	height: auto;
	display: flex;
	flex-direction: row;
	gap: 4px;
	align-items: center;

	.title {
		display: none;
	}

	.btns {
		display: flex;
		flex-direction: row;
		gap: 4px;
		align-items: center;

		button {
			min-width: 36px;
			height: 36px;
			border-radius: 8px;
			font-size: 14px;
			font-weight: 500;
			display: flex;
			align-items: center;
			justify-content: center;
		}
	}
`;
