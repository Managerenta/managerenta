"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { memo, useMemo } from "react";
import { BsCalculator } from "react-icons/bs";
import { FiGrid, FiSettings, FiUsers } from "react-icons/fi";
import { HiOutlineBuildingOffice2 } from "react-icons/hi2";
import { Box, Text } from "@/components";
import { TabSidebarStyled } from "./styled";

const TAB_ITEMS = [
	{ label: "dashboard", value: "Dashboard", icon: <FiGrid size={20} /> },
	{
		label: "properties",
		value: "Properties",
		icon: <HiOutlineBuildingOffice2 size={20} />,
	},
	{ label: "tenants", value: "Tenants", icon: <FiUsers size={20} /> },
	{ label: "settings", value: "Settings", icon: <FiSettings size={20} /> },
];

function TabSidebar() {
	const pathname = usePathname();

	const currentTab = useMemo(() => {
		const segments = pathname.split("/");
		return segments[1] || "dashboard";
	}, [pathname]);

	const navigationItems = useMemo(() => {
		return TAB_ITEMS.map((item, index) => {
			const url = `/${item.label}`;
			const isActive = currentTab === item.label;

			return (
				<Link
					key={index}
					href={url}
					className={`nav-item ${isActive ? "active" : ""}`}
				>
					<Box className="nav-content">
						<Box className="nav-icon">{item.icon}</Box>
						<Text className="nav-text">{item.value}</Text>
					</Box>
				</Link>
			);
		});
	}, [currentTab]);

	return (
		<TabSidebarStyled>
			<Box className="brand-section">
				<BsCalculator />
				<Text className="brand-name">PropertyTrack</Text>
			</Box>
			<Box className="navigation-section">{navigationItems}</Box>
		</TabSidebarStyled>
	);
}

export default memo(TabSidebar);
