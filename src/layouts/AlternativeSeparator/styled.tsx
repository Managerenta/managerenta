"use client";

import styled from "styled-components";
import { Box } from "@/components";

export const AlternativeSeparatorStyled = styled(Box)`
	display: flex;
	align-items: center;
	gap: 10px;
	/* margin: 20px 0; */

	hr {
		flex: 1;
		border: none;
		border-top: 1px solid var(--Secondary-100);
	}

	p {
		font-size: 14px;
		color: var(--Secondary-100);
		font-weight: 400;
	}
`;
