"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BsCalculator } from "react-icons/bs";
import {
	FiBarChart2,
	FiBell,
	FiBriefcase,
	FiCalendar,
	FiChevronDown,
	FiFileText,
	FiGrid,
	FiList,
	FiPlus,
	FiSettings,
	FiShield,
	FiTool,
	FiUsers,
} from "react-icons/fi";
import { HiOutlineBuildingOffice2 } from "react-icons/hi2";
import { Box, Text } from "@/components";
import { useOrganizations } from "@/hooks";
import { useWhoami } from "@/hooks/Admin";
import { TabSidebarStyled } from "./styled";

const TAB_ITEMS = [
	{ label: "dashboard", value: "Dashboard", icon: <FiGrid size={20} /> },
	{
		label: "properties",
		value: "Properties",
		icon: <HiOutlineBuildingOffice2 size={20} />,
	},
	{ label: "tenants", value: "Tenants", icon: <FiUsers size={20} /> },
	{
		label: "maintenance",
		value: "Maintenance",
		icon: <FiTool size={20} />,
	},
	{ label: "vendors", value: "Vendors", icon: <FiBriefcase size={20} /> },
	{
		label: "documents",
		value: "Documents",
		icon: <FiFileText size={20} />,
	},
	{ label: "analytics", value: "Analytics", icon: <FiBarChart2 size={20} /> },
	{ label: "calendar", value: "Calendar", icon: <FiCalendar size={20} /> },
	{
		label: "notifications",
		value: "Notifications",
		icon: <FiBell size={20} />,
	},
	{ label: "audit", value: "Audit", icon: <FiList size={20} /> },
	{ label: "settings", value: "Settings", icon: <FiSettings size={20} /> },
];

function TabSidebar() {
	const pathname = usePathname();
	const router = useRouter();
	const { organizations, currentOrganizationId, current, switchTo } =
		useOrganizations();
	const { operator: isOperator } = useWhoami();
	const [open, setOpen] = useState(false);
	const ref = useRef<HTMLDivElement>(null);

	const currentTab = useMemo(() => {
		const segments = pathname.split("/");
		return segments[1] || "dashboard";
	}, [pathname]);

	const close = useCallback(() => setOpen(false), []);
	useEffect(() => {
		if (!open) return;
		const handler = (e: MouseEvent) => {
			if (ref.current && !ref.current.contains(e.target as Node)) close();
		};
		document.addEventListener("mousedown", handler);
		return () => document.removeEventListener("mousedown", handler);
	}, [open, close]);

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

	const orgItems = useMemo(() => {
		return [
			{
				id: "personal",
				name: "Personal workspace",
				isActive: !currentOrganizationId,
				onClick: () => {
					switchTo(null);
					setOpen(false);
				},
			},
			...organizations.map((o) => {
				const id = o._id ?? o.id ?? "";
				return {
					id,
					name: o.name,
					isActive: currentOrganizationId === id,
					onClick: () => {
						switchTo(id);
						setOpen(false);
					},
				};
			}),
		];
	}, [organizations, currentOrganizationId, switchTo]);

	const activeLabel = current?.name ?? "Personal workspace";
	const activeInitials = (current?.name ?? "Me").slice(0, 2).toUpperCase();

	return (
		<TabSidebarStyled>
			<Box className="brand-section">
				<BsCalculator />
				<Text className="brand-name">manageRenta</Text>
			</Box>

			<Box className="org-switcher" ref={ref}>
				<Box
					className="org-trigger"
					data-testid="org-switcher-trigger"
					onClick={() => setOpen((v) => !v)}
				>
					<Box className="org-avatar">{activeInitials}</Box>
					<Box className="org-label">
						<Text className="org-name">{activeLabel}</Text>
						<Text className="org-role">
							{currentOrganizationId
								? "organization"
								: "personal"}
						</Text>
					</Box>
					<FiChevronDown size={16} />
				</Box>
				{open && (
					<Box className="org-menu" data-testid="org-switcher-menu">
						{orgItems.map((o) => (
							<Box
								key={o.id}
								className={`org-menu-item ${o.isActive ? "active" : ""}`}
								onClick={o.onClick}
							>
								{o.name}
							</Box>
						))}
						<Box
							className="org-menu-item create"
							onClick={() => {
								setOpen(false);
								router.push("/settings?tab=organizations");
							}}
						>
							<FiPlus size={14} />
							<span>Manage organizations</span>
						</Box>
					</Box>
				)}
			</Box>

			<Box className="navigation-section">
				{navigationItems}
				{isOperator ? (
					<Link
						href="/admin"
						className={`nav-item ${
							currentTab === "admin" ? "active" : ""
						}`}
					>
						<Box className="nav-content">
							<Box className="nav-icon">
								<FiShield size={20} />
							</Box>
							<Text className="nav-text">Operator Console</Text>
						</Box>
					</Link>
				) : null}
			</Box>
		</TabSidebarStyled>
	);
}

export default memo(TabSidebar);
