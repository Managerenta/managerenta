"use client";
import styled from "styled-components";
import { Box } from "@/components";

export const TenantModalStyled = styled(Box)`
	display: flex;
	flex-direction: column;
	background: var(--Secondary-200);
	gap: 24px;
	padding: 20px;
	border-radius: 12px;

	.modal-header {
		display: flex;
		flex-direction: column;
		gap: 4px;

		.modal-title {
			font-size: 20px;
			font-weight: 700;
			color: var(--Black);
		}

		.modal-subtitle {
			font-size: 13px;
			color: #64748b;
		}
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
			select {
				width: 100%;
				padding: 10px 12px;
				border: 1px solid #e2e8f0;
				border-radius: 8px;
				font-size: 14px;
				color: var(--Black);
				background: white;
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

				&:disabled {
					background: #f8fafc;
					color: #94a3b8;
					cursor: not-allowed;
				}
			}

			select {
				cursor: pointer;
				appearance: auto;
			}

			.rent-hint {
				font-size: 12px;
				color: #16a34a;
				font-weight: 500;
				margin-top: 2px;
			}
		}
	}

	.modal-actions {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 12px;
		padding-top: 4px;
	}

	@media (max-width: 500px) {
		.form-grid {
			grid-template-columns: 1fr;

			.form-field.full {
				grid-column: 1;
			}
		}

		.modal-actions {
			grid-template-columns: 1fr;
		}
	}
`;
