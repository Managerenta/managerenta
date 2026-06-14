"use client";
import { memo, useMemo, useState } from "react";
import {
	Box,
	Donut,
	Gauge,
	GroupedBarChart,
	HBarList,
	Select,
	Text,
} from "@/components";
import { useAnalytics } from "@/hooks";
import { EntityPageStyled, StatCard } from "../shared/entity";
import { AnalyticsStyled } from "./styled";

const naira = (n: number) => `₦${Math.round(n).toLocaleString("en-NG")}`;
const compactNaira = (n: number) => {
	if (n >= 1_000_000) return `₦${(n / 1_000_000).toFixed(1)}M`;
	if (n >= 1_000) return `₦${(n / 1_000).toFixed(0)}k`;
	return `₦${n}`;
};

const rangeOptions = [
	{ label: "Last 3 months", value: "3" },
	{ label: "Last 6 months", value: "6" },
	{ label: "Last 12 months", value: "12" },
];

function AnalyticsWrapper() {
	const [months, setMonths] = useState("6");
	const { analytics, isLoading } = useAnalytics(Number(months));

	const barData = useMemo(
		() =>
			(analytics?.monthly ?? []).map((m) => ({
				label: m.month,
				values: [m.revenue, m.expenses],
			})),
		[analytics],
	);

	const occupancyItems = useMemo(
		() =>
			(analytics?.occupancyByProperty ?? []).map((p) => ({
				label: p.name,
				value: p.rate,
				sub: `${p.occupied}/${p.total} · ${p.rate}%`,
			})),
		[analytics],
	);

	const maintenanceItems = useMemo(() => {
		const palette = [
			"#1E3A5F",
			"#D97757",
			"#15803D",
			"#B45309",
			"#1D4E89",
			"#8B95A4",
		];
		return (analytics?.maintenanceCost ?? []).map((m, i) => ({
			label: m.category,
			value: m.total,
			color: palette[i % palette.length],
			sub: compactNaira(m.total),
		}));
	}, [analytics]);

	const s = analytics?.summary;

	return (
		<EntityPageStyled>
			<Box className="page-head">
				<Box className="titles">
					<Text className="title">Analytics</Text>
					<Text className="subtitle">
						Revenue, occupancy and collection performance.
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

			<Box className="stat-grid">
				<StatCard
					label="Monthly Revenue"
					value={compactNaira(s?.totalMonthlyRevenue ?? 0)}
				/>
				<StatCard
					label="Occupancy"
					value={`${s?.occupancyRate ?? 0}%`}
				/>
				<StatCard
					label="Collection Rate"
					value={`${s?.collectionRate ?? 0}%`}
				/>
				<StatCard label="Active Tenants" value={s?.totalTenants ?? 0} />
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
					<Text className="card-title">Portfolio Occupancy</Text>
					<Box className="donut-wrap">
						<Donut
							centerLabel={`${s?.occupancyRate ?? 0}%`}
							centerSub="Occupied"
							segments={[
								{
									label: "Occupied",
									value: s?.occupiedUnits ?? 0,
									color: "#1E3A5F",
								},
								{
									label: "Vacant",
									value: s?.vacantUnits ?? 0,
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
									{s?.occupiedUnits ?? 0}
								</Text>
							</Box>
							<Box className="row">
								<span
									className="dot"
									style={{ background: "#D7CDBC" }}
								/>
								<Text>Vacant</Text>
								<Text className="num">
									{s?.vacantUnits ?? 0}
								</Text>
							</Box>
						</Box>
					</Box>
				</Box>

				<Box className="card">
					<Text className="card-title">This Month's Collection</Text>
					<Box className="gauge-wrap">
						<Gauge
							value={s?.collectionRate ?? 0}
							label="Collected"
							color="#15803D"
						/>
						<Box className="collection-meta">
							<Text className="meta-line">
								Collected:{" "}
								<strong>
									{naira(s?.monthlyCollected ?? 0)}
								</strong>
							</Text>
							<Text className="meta-line">
								Expected:{" "}
								<strong>
									{naira(s?.monthlyExpected ?? 0)}
								</strong>
							</Text>
						</Box>
					</Box>
				</Box>

				<Box className="card">
					<Text className="card-title">Occupancy by Property</Text>
					{occupancyItems.length ? (
						<HBarList items={occupancyItems} />
					) : (
						<Box className="chart-empty">No properties yet.</Box>
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

export default memo(AnalyticsWrapper);
