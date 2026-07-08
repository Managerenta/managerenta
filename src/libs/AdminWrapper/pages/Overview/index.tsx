"use client";
import { memo, useMemo } from "react";
import { Box, GroupedBarChart, Text } from "@/components";
import { useAdminOverview } from "@/hooks/Admin";
import { EntityPageStyled, StatCard } from "../../../shared/entity";
import AdminShell from "../../AdminShell";

const naira = (n: number) => `₦${Math.round(n).toLocaleString("en-NG")}`;
const compactNaira = (n: number) => {
	if (n >= 1_000_000) return `₦${(n / 1_000_000).toFixed(1)}M`;
	if (n >= 1_000) return `₦${(n / 1_000).toFixed(0)}k`;
	return `₦${n}`;
};

function OverviewContent() {
	const { overview, isLoading } = useAdminOverview();

	const growthData = useMemo(
		() =>
			(overview?.orgGrowth ?? []).map((g) => ({
				label: g.month,
				values: [g.created],
			})),
		[overview],
	);

	return (
		<EntityPageStyled>
			<Box className="page-head">
				<Box className="titles">
					<Text className="title">Platform Overview</Text>
					<Text className="subtitle">
						Cross-tenant KPIs across every organization.
					</Text>
				</Box>
			</Box>

			<Box className="stat-grid">
				<StatCard
					label="Organizations"
					value={overview?.organizations ?? 0}
				/>
				<StatCard label="Users" value={overview?.users ?? 0} />
				<StatCard label="Operators" value={overview?.operators ?? 0} />
				<StatCard
					label="Properties"
					value={overview?.properties ?? 0}
				/>
				<StatCard label="Units" value={overview?.units ?? 0} />
				<StatCard label="Tenants" value={overview?.tenants ?? 0} />
				<StatCard
					label="Total Revenue"
					value={naira(overview?.totalRevenue ?? 0)}
				/>
				<StatCard
					label="MRR"
					value={naira(overview?.monthlyRecurringRevenue ?? 0)}
				/>
				<StatCard
					label="Occupancy"
					value={`${overview?.occupancyRate ?? 0}%`}
				/>
			</Box>

			<Box className="panel" style={{ padding: 20 }}>
				<Text
					style={{
						fontSize: 15,
						fontWeight: 700,
						color: "var(--Black)",
						marginBottom: 12,
					}}
				>
					Organization Growth
				</Text>
				{growthData.length ? (
					<GroupedBarChart
						data={growthData}
						series={[{ name: "New orgs", color: "#1E3A5F" }]}
						formatValue={(n) => String(n)}
					/>
				) : (
					<Box className="empty">
						{isLoading ? "Loading…" : "No organizations yet."}
					</Box>
				)}
			</Box>
		</EntityPageStyled>
	);
}

function OverviewWrapper() {
	return (
		<AdminShell>
			<OverviewContent />
		</AdminShell>
	);
}

export default memo(OverviewWrapper);
