"use client";
import { memo, useMemo, useState } from "react";
import {
	Box,
	Donut,
	GroupedBarChart,
	HBarList,
	Select,
	Text,
} from "@/components";
import { useAdminAnalytics } from "@/hooks/Admin";
import { AnalyticsStyled } from "../../../AnalyticsWrapper/styled";
import { EntityPageStyled } from "../../../shared/entity";
import AdminShell from "../../AdminShell";

const compactNaira = (n: number) => {
	if (n >= 1_000_000) return `₦${(n / 1_000_000).toFixed(1)}M`;
	if (n >= 1_000) return `₦${(n / 1_000).toFixed(0)}k`;
	return `₦${n}`;
};

const PALETTE = [
	"#1E3A5F",
	"#D97757",
	"#15803D",
	"#B45309",
	"#1D4E89",
	"#8B95A4",
];

const rangeOptions = [
	{ label: "Last 3 months", value: "3" },
	{ label: "Last 6 months", value: "6" },
	{ label: "Last 12 months", value: "12" },
];

function AnalyticsContent() {
	const [months, setMonths] = useState("6");
	const { analytics, isLoading } = useAdminAnalytics(Number(months));

	const barData = useMemo(
		() =>
			(analytics?.monthly ?? []).map((m) => ({
				label: m.month,
				values: [m.revenue, m.expenses],
			})),
		[analytics],
	);

	const topOrgItems = useMemo(
		() =>
			(analytics?.topOrganizations ?? []).map((o, i) => ({
				label: o.name,
				value: o.revenue,
				color: PALETTE[i % PALETTE.length],
				sub: compactNaira(o.revenue),
			})),
		[analytics],
	);

	const maintenanceItems = useMemo(
		() =>
			(analytics?.maintenanceByCategory ?? []).map((m, i) => ({
				label: m.category,
				value: m.total,
				color: PALETTE[i % PALETTE.length],
				sub: compactNaira(m.total),
			})),
		[analytics],
	);

	const occ = analytics?.occupancy;
	const occTotal = (occ?.occupied ?? 0) + (occ?.vacant ?? 0);
	const occRate = occTotal
		? Math.round(((occ?.occupied ?? 0) / occTotal) * 100)
		: 0;

	return (
		<EntityPageStyled>
			<Box className="page-head">
				<Box className="titles">
					<Text className="title">Platform Analytics</Text>
					<Text className="subtitle">
						Revenue, occupancy and maintenance across all tenants.
					</Text>
				</Box>
				<Box style={{ width: 200 }}>
					<Select
						options={rangeOptions}
						value={months}
						onChange={setMonths}
						isSearchable={false}
					/>
				</Box>
			</Box>

			<AnalyticsStyled>
				<Box className="card wide">
					<Box className="card-head">
						<Text className="card-title">Revenue vs Expenses</Text>
						<Box className="legend">
							<span
								className="dot"
								style={{ background: "#1E3A5F" }}
							/>
							<Text className="legend-label">Revenue</Text>
							<span
								className="dot"
								style={{ background: "#D97757" }}
							/>
							<Text className="legend-label">Expenses</Text>
						</Box>
					</Box>
					{barData.length ? (
						<GroupedBarChart
							data={barData}
							series={[
								{ name: "Revenue", color: "#1E3A5F" },
								{ name: "Expenses", color: "#D97757" },
							]}
							formatValue={compactNaira}
						/>
					) : (
						<Box className="chart-empty">
							{isLoading
								? "Loading…"
								: "No transaction data yet."}
						</Box>
					)}
				</Box>

				<Box className="card">
					<Text className="card-title">Occupancy</Text>
					<Box className="donut-wrap">
						<Donut
							centerLabel={`${occRate}%`}
							centerSub="Occupied"
							segments={[
								{
									label: "Occupied",
									value: occ?.occupied ?? 0,
									color: "#1E3A5F",
								},
								{
									label: "Vacant",
									value: occ?.vacant ?? 0,
									color: "#D7CDBC",
								},
							]}
						/>
						<Box className="donut-legend">
							<Box className="row">
								<span
									className="dot"
									style={{ background: "#1E3A5F" }}
								/>
								<Text>Occupied</Text>
								<Text className="num">
									{occ?.occupied ?? 0}
								</Text>
							</Box>
							<Box className="row">
								<span
									className="dot"
									style={{ background: "#D7CDBC" }}
								/>
								<Text>Vacant</Text>
								<Text className="num">{occ?.vacant ?? 0}</Text>
							</Box>
						</Box>
					</Box>
				</Box>

				<Box className="card">
					<Text className="card-title">
						Top Organizations by Revenue
					</Text>
					{topOrgItems.length ? (
						<HBarList items={topOrgItems} />
					) : (
						<Box className="chart-empty">
							No revenue recorded yet.
						</Box>
					)}
				</Box>

				<Box className="card">
					<Text className="card-title">
						Maintenance Spend by Category
					</Text>
					{maintenanceItems.length ? (
						<HBarList items={maintenanceItems} />
					) : (
						<Box className="chart-empty">
							No maintenance costs logged.
						</Box>
					)}
				</Box>
			</AnalyticsStyled>
		</EntityPageStyled>
	);
}

function AnalyticsWrapper() {
	return (
		<AdminShell>
			<AnalyticsContent />
		</AdminShell>
	);
}

export default memo(AnalyticsWrapper);
