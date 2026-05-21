"use client";
import styled from "styled-components";
import { Box } from "@/components";

export const AuthPageStyled = styled(Box)`
	min-height: 100vh;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 24px;
	background: var(--Surface-Page);

	.card {
		width: 100%;
		max-width: 420px;
		background: var(--Surface-Card);
		border: 1px solid var(--Border-Subtle);
		border-radius: 14px;
		padding: 28px;
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	.title {
		font-size: 22px;
		font-weight: 700;
		color: var(--Black);
	}

	.desc {
		font-size: 13px;
		color: #475569;
		line-height: 1.5;

		&.success {
			color: #16a34a;
		}

		&.error {
			color: #ef4444;
		}
	}

	input {
		padding: 10px 14px;
		border: 1px solid var(--Border-Subtle);
		border-radius: 8px;
		font-size: 14px;
		background: var(--Surface-Page);
		color: var(--Black);
	}

	.footer-link {
		margin-top: 6px;
		text-align: center;

		a {
			color: var(--Main-Blue);
			font-size: 13px;
		}
	}
`;
