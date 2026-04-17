"use client";
import styled from "styled-components";
import { Box } from "@/components";

export const ContactInfoStyled = styled(Box)`
	background: var(--Surface-Card);
	border-radius: 12px;
	padding: 24px;
	border: 1px solid var(--Border-Subtle);
	display: flex;
	flex-direction: column;
	gap: 16px;

	.contact-header {
		display: flex;
		justify-content: space-between;
		align-items: center;

		.section-title {
			font-size: 16px;
			font-weight: 700;
			color: var(--Black);
		}

		.edit-link button {
			background: none;
			border: none;
			color: #3b82f6;
			font-size: 14px;
			font-weight: 500;
			cursor: pointer;

			&:hover {
				text-decoration: underline;
			}
		}
	}

	.contact-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 16px;

		.contact-left,
		.contact-right {
			display: flex;
			flex-direction: column;
			gap: 10px;
		}

		.contact-row {
			display: flex;
			align-items: center;
			gap: 8px;

			svg {
				color: #64748b;
				flex-shrink: 0;
			}

			.contact-label {
				font-size: 14px;
				color: #64748b;
			}

			.contact-value {
				font-size: 14px;
				color: var(--Black);

				&.bold {
					font-weight: 700;
				}
			}
		}
	}

	@media (max-width: 767px) {
		padding: 16px;

		.contact-header {
			.section-title {
				display: none;
			}
		}

		.contact-grid {
			grid-template-columns: 1fr;
			gap: 12px;

			.contact-row {
				display: flex;
				align-items: center;
				justify-content: space-between;
				padding: 12px 14px;
				background: var(--Surface-Page);
				border-radius: 10px;

				.contact-action-btn {
					width: 36px;
					height: 36px;
					border-radius: 50%;
					background: #16a34a;
					color: white;
					display: flex;
					align-items: center;
					justify-content: center;
					flex-shrink: 0;
				}
			}

			.contact-right {
				.contact-row {
					background: none;
					padding: 4px 0;
				}
			}
		}
	}
`;
