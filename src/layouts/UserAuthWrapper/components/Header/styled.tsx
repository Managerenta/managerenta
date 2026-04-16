"use client";

import styled from "styled-components";

export const HeaderStyled = styled.header`
	display: flex;
	flex-direction: column;
	gap: 5px;
	align-items: center;
	justify-content: center;

	h1 {
		font-size: 24px;
		font-weight: 700;
	}

	p {
		font-size: 16px;
		color: var(--Text-Secondary);
	}
`;
