"use client";
import styled from "styled-components";
import { Box } from "@/components";

export const AnalyticsStyled = styled(Box)`
	display: grid;
	grid-template-columns: repeat(2, 1fr);
	gap: 16px;

	.card {
		background: var(--Surface-Card);
		border: 1px solid var(--Border-Subtle);
		border-radius: var(--mr-radius-md);
		padding: 20px;
		box-shadow: var(--mr-shadow-sm);
		min-width: 0;
	}
	.card.wide {
		grid-column: 1 / -1;
	}
	.card-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 12px;
		flex-wrap: wrap;
		gap: 8px;
	}
	.card-title {
		font-size: 15px;
		font-weight: 700;
		color: var(--Black);
		margin-bottom: 12px;
	}
	.card-head .card-title {
		margin-bottom: 0;
	}
	.legend {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.legend-label {
		font-size: 12px;
		color: var(--Text-Secondary);
		margin-right: 6px;
	}
	.dot {
		display: inline-block;
		width: 10px;
		height: 10px;
		border-radius: 999px;
	}
	.chart-empty {
		padding: 40px 0;
		text-align: center;
		color: var(--Text-Secondary);
		font-size: 14px;
	}
	.donut-wrap,
	.gauge-wrap {
		display: flex;
		align-items: center;
		gap: 20px;
		flex-wrap: wrap;
	}
	.donut-legend {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.donut-legend .row {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 13px;
	}
	.donut-legend .num {
		font-weight: 700;
		color: var(--Black);
	}
	.collection-meta {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.meta-line {
		font-size: 13px;
		color: var(--Text-Secondary);
	}
	.meta-line strong {
		color: var(--Black);
	}

	@media (max-width: 900px) {
		grid-template-columns: 1fr;
	}
`;
