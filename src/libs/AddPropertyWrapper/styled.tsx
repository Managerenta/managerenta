"use client";
import styled from "styled-components";
import { Box } from "@/components";

export const AddPropertyWrapperStyled = styled(Box)`
	display: flex;
	flex-direction: column;
	gap: 20px;
	width: 100%;
	padding: 10px 5px;
	background: var(--Surface-Page);

	.page-header {
		display: flex;
		flex-direction: column;
		gap: 16px;

		.breadcrumb {
			display: flex;
			align-items: center;
			gap: 8px;
			font-size: 14px;
			flex-wrap: wrap;

			a {
				color: #3b82f6;
				text-decoration: none;
				&:hover {
					text-decoration: underline;
				}
			}

			.separator {
				color: #94a3b8;
			}

			.current {
				color: #64748b;
			}
		}

		.title-row {
			display: flex;
			align-items: flex-start;
			justify-content: space-between;

			.title-section {
				display: flex;
				flex-direction: column;
				gap: 4px;

				.page-title {
					font-size: 24px;
					font-weight: 700;
					color: var(--Black);
				}

				.page-subtitle {
					font-size: 14px;
					color: var(--Text-Secondary);
				}
			}

			.close-btn button {
				width: 40px;
				height: 40px;
				display: flex;
				align-items: center;
				justify-content: center;
				border: none;

				&:hover {
					background: var(--Surface-Muted);
				}
			}
		}
	}

	.form-card {
		display: flex;
		flex-direction: column;
		gap: 24px;
		background: var(--Surface-Card);
		padding: 24px;
		border-radius: 12px;
		border: 1px solid var(--Border-Subtle);
	}

	.form-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 16px;

		.form-field {
			display: flex;
			flex-direction: column;
			gap: 6px;

			&.full {
				grid-column: 1 / -1;
			}

			.field-label {
				font-size: 13px;
				font-weight: 500;
				color: #374151;

				.required {
					color: #ef4444;
					margin-left: 2px;
				}

				.optional {
					color: #94a3b8;
					font-weight: 400;
					margin-left: 4px;
				}
			}

			input,
			select,
			textarea {
				width: 100%;
				padding: 10px 12px;
				border: 1px solid var(--Border-Subtle);
				border-radius: 8px;
				font-size: 14px;
				color: var(--Black);
				background: var(--Surface-Card);
				outline: none;
				transition: border-color 0.15s ease;
				font-family: inherit;
				box-sizing: border-box;

				&:focus {
					border-color: var(--Main-Blue);
				}

				&::placeholder {
					color: #94a3b8;
				}
			}

			select {
				cursor: pointer;
				appearance: auto;
			}

			textarea {
				resize: vertical;
				min-height: 80px;
			}
		}
	}

	.form-actions {
		display: flex;
		gap: 12px;
		justify-content: flex-end;
		padding-top: 4px;

		button {
			min-width: 140px;
		}
	}

	@media (max-width: 767px) {
		padding: 12px;
		gap: 14px;

		.page-header .breadcrumb {
			display: none;
		}

		.page-header .title-row .title-section .page-title {
			font-size: 20px;
		}

		.form-card {
			padding: 16px;
		}

		.form-grid {
			grid-template-columns: 1fr;

			.form-field.full {
				grid-column: 1;
			}
		}

		.form-actions {
			flex-direction: column-reverse;

			button {
				width: 100%;
			}
		}
	}
`;
