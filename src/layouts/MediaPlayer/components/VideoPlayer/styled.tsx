"use client";
import styled from "styled-components";
import { Box } from "../../../../components";

export const VideoPlayerStyled = styled(Box)<{ $borderRadius?: string }>`
	* img {
		max-height: unset !important;
		object-fit: unset !important;
	}

	video {
		border-radius: ${(props) => props?.$borderRadius ?? "unset"} !important;
	}

	box-sizing: content-box;
`;
