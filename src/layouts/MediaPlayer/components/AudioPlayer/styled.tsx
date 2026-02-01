"use client";
import styled from "styled-components";
import { Box } from "../../../../components";

export const AudioPlayerStyled = styled(Box)<{ $thumbnail?: string }>`
	background: url(${(props) => props.$thumbnail || "var(--White)"})
		center/contain no-repeat;
	user-select: none;

	*,
	*:hover,
	*:focus {
		border: transparent;
		outline: none;
	}
`;
