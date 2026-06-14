"use client";
import styled from "styled-components";
import { Box } from "@/components";

export const PortalStyled = styled(Box)`
	min-height: 100vh;
	background: var(--Surface-Page);

	.portal-topbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 16px 20px;
		background: var(--mr-color-brand);
		color: var(--mr-color-brand-on);
	}
	.brand {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 18px;
	}
	.brand-name {
		font-weight: 700;
		color: var(--mr-color-brand-on);
	}
	.portal-tag {
		font-size: 13px;
		opacity: 0.85;
		color: var(--mr-color-brand-on);
	}

	.portal-shell {
		max-width: 760px;
		margin: 0 auto;
		padding: 24px 16px 56px;
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.hero .hello {
		font-size: 24px;
		font-weight: 700;
		color: var(--Black);
	}
	.hero-sub {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 14px;
		color: var(--Text-Secondary);
		margin-top: 4px;
	}

	.cards {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 16px;
	}
	.balance-card {
		border-radius: var(--mr-radius-lg);
		padding: 22px;
		color: var(--mr-color-brand-on);
		display: flex;
		flex-direction: column;
		gap: 6px;
		background: linear-gradient(135deg, #1e3a5f, #284e7e);
	}
	.balance-card.due {
		background: linear-gradient(135deg, #8a2b2b, #b91c1c);
	}
	.bc-label {
		font-size: 13px;
		opacity: 0.85;
		color: var(--mr-color-brand-on);
	}
	.bc-value {
		font-size: 32px;
		font-weight: 800;
		color: var(--mr-color-brand-on);
		line-height: 1.1;
	}
	.bc-meta {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 12px;
		opacity: 0.9;
		color: var(--mr-color-brand-on);
		margin-bottom: 10px;
	}

	.info-card {
		background: var(--Surface-Card);
		border: 1px solid var(--Border-Subtle);
		border-radius: var(--mr-radius-lg);
		padding: 14px 18px;
		display: flex;
		flex-direction: column;
		justify-content: center;
		gap: 4px;
	}
	.info-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 8px 0;
		border-bottom: 1px solid var(--Border-Subtle);
	}
	.info-row:last-child {
		border-bottom: none;
	}
	.ir-label {
		font-size: 13px;
		color: var(--Text-Secondary);
	}
	.ir-value {
		font-size: 14px;
		font-weight: 600;
		color: var(--Black);
	}

	.section-title {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 16px;
		font-weight: 700;
		color: var(--Black);
		margin-bottom: 10px;
	}

	.panel {
		background: var(--Surface-Card);
		border: 1px solid var(--Border-Subtle);
		border-radius: var(--mr-radius-md);
		overflow: hidden;
	}
	.table-scroll {
		overflow-x: auto;
	}
	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 14px;
		min-width: 480px;
	}
	thead th {
		text-align: left;
		padding: 12px 16px;
		font-size: 12px;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--Text-Secondary);
		background: var(--Surface-Muted);
		border-bottom: 1px solid var(--Border-Subtle);
	}
	tbody td {
		padding: 12px 16px;
		border-bottom: 1px solid var(--Border-Subtle);
		color: var(--Text-Primary);
	}
	tbody tr:last-child td {
		border-bottom: none;
	}
	.empty {
		padding: 32px;
		text-align: center;
		color: var(--Text-Secondary);
		font-size: 14px;
	}

	.maint-form {
		background: var(--Surface-Card);
		border: 1px solid var(--Border-Subtle);
		border-radius: var(--mr-radius-md);
		padding: 18px;
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 14px;
	}
	.mf-field {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.mf-field.full {
		grid-column: 1 / -1;
	}
	.mf-label {
		font-size: 13px;
		font-weight: 600;
		color: var(--Text-Primary);
	}
	.maint-form input,
	.maint-form textarea {
		width: 100%;
		min-height: 44px;
		padding: 10px 14px;
		border: 1px solid var(--Border-Subtle);
		border-radius: var(--mr-radius-sm);
		background: var(--Surface-Card);
		color: var(--Text-Primary);
		font-size: 14px;
		font-family: inherit;
	}
	.maint-form textarea {
		resize: vertical;
	}
	.mf-actions {
		grid-column: 1 / -1;
		display: flex;
		justify-content: flex-end;
	}

	.error-card {
		max-width: 420px;
		margin: 80px auto;
		text-align: center;
		background: var(--Surface-Card);
		border: 1px solid var(--Border-Subtle);
		border-radius: var(--mr-radius-lg);
		padding: 32px;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 10px;
	}
	.error-title {
		font-size: 18px;
		font-weight: 700;
		color: var(--Black);
	}
	.error-sub {
		font-size: 14px;
		color: var(--Text-Secondary);
	}

	.portal-foot {
		text-align: center;
		font-size: 12px;
		color: var(--mr-color-text-subtle);
		margin-top: 8px;
	}

	@media (max-width: 640px) {
		.cards,
		.maint-form {
			grid-template-columns: 1fr;
		}
	}
`;
