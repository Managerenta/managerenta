"use client";
import styled from "styled-components";
import { Box } from "@/components";

export const SettingsFooterStyled = styled(Box)`
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding-top: 20px;
	border-top: 1px solid #e2e8f0;

	.footer-left,
	.footer-right {
		display: flex;
		align-items: center;
		gap: 20px;
	}

	.version {
		font-size: 13px;
		color: #94a3b8;
		font-weight: 500;
	}

	.footer-link {
		font-size: 13px;
		color: #64748b;
		cursor: pointer;
		transition: color 0.2s;

		&:hover {
			color: var(--Main-Blue);
		}
	}

	@media (max-width: 767px) {
		flex-direction: column;
		gap: 12px;
		align-items: flex-start;

		.footer-left,
		.footer-right {
			flex-wrap: wrap;
			gap: 12px;
		}
	}
`;
