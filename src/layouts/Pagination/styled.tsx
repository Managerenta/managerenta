"use client";

import styled from "styled-components";
import { Box } from "@/components";

export const PaginationStyled = styled(Box)`
	width: 100%;
	height: auto;
	display: flex;
	flex-direction: row;
	gap: 10px;
	align-items: center;
	justify-content: space-between;
	flex-wrap: wrap;

	.title {
		width: auto;
		font-size: 18px;
	}

	.btns {
		display: flex;
		flex-direction: row;
		gap: 10px;
	}
`;
