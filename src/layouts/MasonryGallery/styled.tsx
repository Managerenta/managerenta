"use client";

import styled from "styled-components";
import { Box } from "@/components";

export const MasonryGalleryStyled = styled(Box)<{ $gap: string }>`
	display: flex;
	flex-wrap: wrap;
	width: 100%;
	gap: ${({ $gap }) => $gap};

	.card-item {
		/* flex: 1 1 auto; */
		/* flex: 1 1 auto; */
		flex-grow: 1;
		flex-shrink: 1;
		flex-basis: auto;

		height: 300px;
		overflow: hidden;
		border-radius: 16px;
		cursor: pointer;

		img {
			/* width: 100%;
				height: 100%; */
			/* object-fit: cover; */
			/* border: 4px solid var(--Secondary-600) !important; */
			transition: all 250ms ease-in-out;

			&:hover {
				transform: scale(1.15);
			}
		}
	}

	@media (max-width: 800px) {
		.card-item {
			/* flex: 1 1 350px; */
			flex-grow: 1;
			flex-shrink: 1;
			flex-basis: 350px;
			height: auto;
		}
	}
`;
