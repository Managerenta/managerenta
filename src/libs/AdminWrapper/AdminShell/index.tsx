"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect } from "react";
import {
	FiActivity,
	FiArrowLeft,
	FiBarChart2,
	FiGrid,
	FiHome,
	FiShield,
} from "react-icons/fi";
import { Box, Loader, Text } from "@/components";
import { useWhoami } from "@/hooks/Admin";
import { AdminShellStyled } from "./styled";

const NAV_ITEMS = [
	{ label: "Overview", href: "/admin", icon: <FiHome size={18} /> },
	{
		label: "Organizations",
		href: "/admin/organizations",
		icon: <FiGrid size={18} />,
	},
	{ label: "IAM", href: "/admin/iam", icon: <FiShield size={18} /> },
	{
		label: "Analytics",
		href: "/admin/analytics",
		icon: <FiBarChart2 size={18} />,
	},
	{ label: "Audit", href: "/admin/audit", icon: <FiActivity size={18} /> },
];

function isActive(pathname: string, href: string): boolean {
	if (href === "/admin") return pathname === "/admin";
	return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AdminShell({ children }: { children: ReactNode }) {
	const pathname = usePathname();
	const router = useRouter();
	const { operator, isLoading } = useWhoami();

	useEffect(() => {
		if (!isLoading && !operator) router.replace("/dashboard");
	}, [isLoading, operator, router]);

	if (isLoading) {
		return (
			<AdminShellStyled>
				<Box className="shell-loader">
					<Loader loader="moonLoader" color="var(--mr-color-brand)" />
				</Box>
			</AdminShellStyled>
		);
	}

	if (!operator) return null;

	return (
		<AdminShellStyled>
			<Box className="admin-sidebar">
				<Box className="admin-brand">
					<Box className="brand-badge">
						<FiShield size={18} />
					</Box>
					<Box>
						<Text className="brand-title">manageRenta</Text>
						<Text className="brand-sub">Operator</Text>
					</Box>
				</Box>

				{NAV_ITEMS.map((item) => (
					<Link
						key={item.href}
						href={item.href}
						className={`nav-item ${
							isActive(pathname, item.href) ? "active" : ""
						}`}
					>
						<Box className="nav-icon">{item.icon}</Box>
						<span>{item.label}</span>
					</Link>
				))}

				<Box className="nav-spacer" />
				<Link href="/dashboard" className="back-link">
					<FiArrowLeft size={16} />
					<span>Back to app</span>
				</Link>
			</Box>

			<Box className="admin-main">
				<Box className="admin-header">
					<Text className="header-title">Operator Console</Text>
					<span className="header-pill">
						<FiShield size={13} /> Platform operator
					</span>
				</Box>
				<Box className="admin-content">{children}</Box>
			</Box>
		</AdminShellStyled>
	);
}
