"use client";
import styled from "styled-components";
import { Box } from "@/components";

export const KeyHighlightsStyled = styled(Box)`
	height: auto;
	display: flex;
	flex-direction: column;
	gap: 15px;
	color: #ffffff;

	header {
		display: flex;
		align-items: center;
		gap: 2px;

		svg {
			font-size: 30px;
			color: #ffffff;
		}

		p {
			font-size: 24px;
			font-weight: 700;
			line-height: 1.5;
			color: #ffffff;
		}
	}

	.title {
		font-size: 36px;
		font-weight: 700;
		line-height: 1.5;
		color: #ffffff;
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
				color: #4ade80;
			}

			p {
				font-size: 16px;
				color: rgba(255, 255, 255, 0.9);
			}
		}
	}
`;
