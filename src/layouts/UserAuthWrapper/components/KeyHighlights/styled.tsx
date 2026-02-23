"use client";
import styled from "styled-components";
import { Box } from "@/components";

export const KeyHighlightsStyled = styled(Box)`
	height: auto;
	display: flex;
	flex-direction: column;
	gap: 15px;

	header {
		display: flex;
		align-items: center;
		gap: 2px;

		svg {
			font-size: 30px;
		}

		p {
			font-size: 24px;
			font-weight: 700;
			line-height: 1.5;
		}
	}

	.title {
		font-size: 36px;
		font-weight: 700;
		line-height: 1.5;
	}

	ul {
		margin-top: 10px;
		display: flex;
		flex-direction: column;
		gap: 10px;

		li {
			display: flex;
			align-items: center;
			gap: 6px;

			svg {
				font-size: 24px;
				color: green;
			}

			p {
				/* font-size: 18px; */
				font-size: 16px;
			}
		}
	}
`;
