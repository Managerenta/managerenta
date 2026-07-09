"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useContext, useEffect } from "react";
import {
	FiActivity,
	FiBarChart2,
	FiGrid,
	FiHome,
	FiLogOut,
	FiShield,
	FiUsers,
} from "react-icons/fi";
import { Box, Loader, Text } from "@/components";
import { AppContextProvider } from "@/hooks";
import { useWhoami } from "@/hooks/Admin";
import { AdminShellStyled } from "./styled";

const NAV_ITEMS = [
	{ label: "Overview", href: "/admin", icon: <FiHome size={18} /> },
	{
		label: "Organizations",
		href: "/admin/organizations",
		icon: <FiGrid size={18} />,
	},
	{ label: "Users", href: "/admin/users", icon: <FiUsers size={18} /> },
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
	const { deleteAllCookies } = useContext(AppContextProvider);

	useEffect(() => {
		if (!isLoading && !operator) router.replace("/dashboard");
	}, [isLoading, operator, router]);

	const handleSignOut = async () => {
		await deleteAllCookies();
		router.push("/login");
	};

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
				<button
					type="button"
					className="back-link"
					onClick={handleSignOut}
				>
					<FiLogOut size={16} />
					<span>Sign out</span>
				</button>
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
