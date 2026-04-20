"use client";
import { memo, useMemo } from "react";
import { FiBell, FiDownload, FiFileText, FiPlus } from "react-icons/fi";
import { Box, Button, Image, Text } from "@/components";
import type { ITopTenant } from "@/types";
import { PropertySidebarStyled } from "./styled";

interface IProps {
	topTenants: ITopTenant[];
	averageVacancyDays: string;
	rentCollectedThisYear: string;
}

interface QuickActionItem {
	id: string;
	label: string;
	icon: React.ReactNode;
}

function PropertySidebar({
	topTenants,
	averageVacancyDays,
	rentCollectedThisYear,
}: IProps) {
	const quickActions = useMemo((): QuickActionItem[] => {
		return [
			{ id: "qa-001", label: "Add New Unit", icon: <FiPlus size={16} /> },
			{
				id: "qa-002",
				label: "View All Transactions",
				icon: <FiFileText size={16} />,
			},
			{
				id: "qa-003",
				label: "Send Reminder to All",
				icon: <FiBell size={16} />,
			},
			{
				id: "qa-004",
				label: "Export Property Report",
				icon: <FiDownload size={16} />,
			},
		];
	}, []);

	const renderedQuickActions = useMemo(() => {
		return quickActions.map(({ id, label, icon }) => {
			if (id === "qa-001") {
				return (
					<Box key={id} className="add-unit-action">
						<Button
							type="button"
							title={
								<Box
									style={{
										display: "flex",
										alignItems: "center",
										gap: "8px",
										justifyContent: "center",
									}}
								>
									{icon}
									<span>{label}</span>
								</Box>
							}
							background="var(--Main-Blue)"
							color="white"
							borderRadius="8px"
							width="100%"
						/>
					</Box>
				);
			}

			return (
				<Box key={id} className="action-item">
					<Box className="action-icon">{icon}</Box>
					<Text className="action-label">{label}</Text>
				</Box>
			);
		});
	}, [quickActions]);

	const renderedTopTenants = useMemo(() => {
		if (topTenants.length === 0)
			return <Text className="no-tenants">No data yet</Text>;
		return topTenants.map(
			({ id, name, unit, monthlyRent, avatar }, index) => (
				<Box key={id ?? index} className="tenant-row">
					<Box className="tenant-avatar">
						{avatar ? (
							<Image
								url={avatar}
								alt={name}
								width="32px"
								height="32px"
								borderRadius="50%"
								style={{ objectFit: "cover" }}
							/>
						) : (
							<Box className="avatar-placeholder" />
						)}
					</Box>
					<Box className="tenant-info">
						<Text className="tenant-name">{name}</Text>
						<Text className="tenant-unit">{unit}</Text>
					</Box>
					<Text className="tenant-amount">{monthlyRent}</Text>
				</Box>
			),
		);
	}, [topTenants]);

	return (
		<PropertySidebarStyled>
			<Box className="quick-actions-card">
				<Text className="card-title">Quick Actions</Text>
				<Box className="actions-list">{renderedQuickActions}</Box>
			</Box>

			<Box className="statistics-card">
				<Text className="card-title">Property Statistics</Text>

				{/* <Box className="stat-section">
					<Text className="stat-subtitle">
						Occupancy Trend (Last 6 Months)
					</Text>
					<Box className="chart-placeholder" />
				</Box> */}

				<Box className="stat-row">
					<Text className="stat-label">Average Vacancy Duration</Text>
					<Text className="stat-value-text">
						{averageVacancyDays}
					</Text>
				</Box>

				<Box className="stat-row">
					<Text className="stat-label">Rent Collected This Year</Text>
					<Text className="stat-value-text bold">
						{rentCollectedThisYear}
					</Text>
				</Box>

				<Box className="top-tenants">
					<Text className="stat-subtitle">Top Paying Tenants</Text>
					<Box className="tenants-list">{renderedTopTenants}</Box>
				</Box>
			</Box>
		</PropertySidebarStyled>
	);
}

export default memo(PropertySidebar);
