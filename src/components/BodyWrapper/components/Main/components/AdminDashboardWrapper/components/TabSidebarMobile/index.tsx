"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { memo, useMemo } from "react";
import { FiGrid, FiSettings, FiUsers } from "react-icons/fi";
import { HiOutlineBuildingOffice2 } from "react-icons/hi2";
import { Box, Text } from "@/components";
import { MobileTabBarStyled } from "./styled";

const TAB_ITEMS = [
	{ label: "dashboard", value: "Dashboard", icon: <FiGrid size={22} /> },
	{
		label: "properties",
		value: "Properties",
		icon: <HiOutlineBuildingOffice2 size={22} />,
	},
	{ label: "tenants", value: "Tenants", icon: <FiUsers size={22} /> },
	{ label: "settings", value: "Settings", icon: <FiSettings size={22} /> },
];

function MobileTabBar() {
	const pathname = usePathname();

	const currentTab = useMemo(() => {
		const segments = pathname.split("/");
		return segments[1] || "dashboard";
	}, [pathname]);

	const tabs = useMemo(() => {
		return TAB_ITEMS.map((item, index) => {
			const isActive = currentTab === item.label;
			return (
				<Link
					key={index}
					href={`/${item.label}`}
					className={`tab-item ${isActive ? "active" : ""}`}
				>
					<Box className="tab-icon">{item.icon}</Box>
					<Text className="tab-label">{item.value}</Text>
				</Link>
			);
		});
	}, [currentTab]);

	return <MobileTabBarStyled>{tabs}</MobileTabBarStyled>;
}

export default memo(MobileTabBar);
