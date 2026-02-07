"use client";

import styled from "styled-components";
import { Box } from "@/components";

export const ReviewsStyled = styled(Box)`
	width: 100%;
	height: 100%;
	display: flex;
	flex-direction: column;

	.review {
		width: 100%;
		height: auto;
		background: #2d5a8c;
		color: var(--White);
		padding: 15px;
		border-radius: 4px;
		display: flex;
		flex-direction: column;
		gap: 5px;

		.header {
			display: flex;
			align-items: center;
			gap: 10px;

			img {
				width: 40px !important;
				height: 40px !important;
				aspect-ratio: 1 !important;
				border-radius: 50% !important;
				object-fit: cover;
			}

			h4 {
				font-size: 16px;
				font-weight: 600;
			}

			p {
				font-size: 14px;
			}
		}

		p {
			font-size: 14px;
		}
	}
`;
