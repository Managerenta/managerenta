"use client";
import styled from "styled-components";
import { Box } from "@/components";

export const OrganizationsSettingsStyled = styled(Box)`
	display: flex;
	flex-direction: column;
	gap: 16px;

	.section {
		background: var(--Surface-Card);
		border-radius: 12px;
		padding: 20px;
		border: 1px solid var(--Border-Subtle);
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.section-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
	}

	.section-title {
		font-size: 16px;
		font-weight: 700;
		color: var(--Black);
	}

	.caption {
		font-size: 12px;
		color: #94a3b8;
		line-height: 1.5;
	}

	.link {
		color: var(--Main-Blue);
		text-decoration: underline;
	}

	.orgs-list {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.org-pill {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 10px 14px;
		background: var(--Surface-Page);
		border-radius: 10px;
		cursor: pointer;
		border: 1px solid transparent;

		&.active {
			border-color: var(--Main-Blue);
			background: rgba(37, 99, 235, 0.06);
		}
	}

	.org-avatar {
		width: 36px;
		height: 36px;
		border-radius: 50%;
		background: var(--Main-Blue);
		color: white;
		font-size: 12px;
		font-weight: 700;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.org-meta {
		flex: 1;
		display: flex;
		flex-direction: column;
	}

	.org-name {
		font-size: 14px;
		font-weight: 600;
		color: var(--Black);
	}

	.org-role {
		font-size: 12px;
		color: #94a3b8;
		text-transform: capitalize;
	}

	.form-field {
		display: flex;
		flex-direction: column;
		gap: 6px;

		.field-label {
			font-size: 13px;
			font-weight: 600;
			color: #64748b;
		}

		input {
			padding: 10px 14px;
			border: 1px solid var(--Border-Subtle);
			border-radius: 8px;
			font-size: 14px;
			color: var(--Black);
			background: var(--Surface-Page);
		}
	}

	.action-btn {
		align-self: flex-start;

		button {
			padding: 10px 24px;
			font-size: 14px;
			font-weight: 500;
		}
	}

	.invite-row {
		display: grid;
		grid-template-columns: 1fr 140px 140px;
		gap: 8px;
		align-items: center;

		input {
			padding: 10px 14px;
			border: 1px solid var(--Border-Subtle);
			border-radius: 8px;
			font-size: 14px;
			background: var(--Surface-Page);
		}

		.btn-inner {
			display: flex;
			align-items: center;
			gap: 6px;
			justify-content: center;
		}
	}

	.members-table {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.members-section-label {
		font-size: 12px;
		font-weight: 600;
		color: #64748b;
		text-transform: uppercase;
		letter-spacing: 0.4px;
	}

	.member-row {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 10px 14px;
		background: var(--Surface-Page);
		border-radius: 8px;
	}

	.member-info {
		flex: 1;
		display: flex;
		flex-direction: column;
	}

	.member-name {
		font-size: 14px;
		font-weight: 600;
		color: var(--Black);
	}

	.member-email {
		font-size: 12px;
		color: #94a3b8;
	}

	.member-role {
		font-size: 12px;
		color: #64748b;
		text-transform: capitalize;
		padding: 4px 8px;
		background: var(--Surface-Card);
		border-radius: 999px;
	}

	.member-row .role-select {
		width: 150px;
		flex: 0 0 auto;
	}

	.remove-btn {
		width: 28px;
		height: 28px;
		border-radius: 6px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		color: #ef4444;

		&:hover {
			background: #fef2f2;
		}
	}

	@media (max-width: 640px) {
		.invite-row {
			grid-template-columns: 1fr;
		}
	}
`;
