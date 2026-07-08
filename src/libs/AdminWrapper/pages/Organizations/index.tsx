"use client";
import { useRouter } from "next/navigation";
import { memo, useEffect, useMemo, useState } from "react";
import { Box, Text } from "@/components";
import { useAdminOrganizations } from "@/hooks/Admin";
import { Badge, EntityPageStyled, StatCard } from "../../../shared/entity";
import AdminShell from "../../AdminShell";

function OrganizationsContent() {
	const router = useRouter();
	const [query, setQuery] = useState("");
	const [search, setSearch] = useState("");

	useEffect(() => {
		const t = setTimeout(() => setSearch(query.trim()), 350);
		return () => clearTimeout(t);
	}, [query]);

	const { organizations, total, isLoading } = useAdminOrganizations(search);

	const rows = useMemo(
		() =>
			organizations.map((o) => (
				<tr
					key={o.id}
					style={{ cursor: "pointer" }}
					onClick={() => router.push(`/admin/organizations/${o.id}`)}
				>
					<td>
						<Text style={{ fontWeight: 600 }}>{o.name}</Text>
						{o.description ? (
							<Text
								style={{
									fontSize: 12,
									color: "var(--Text-Secondary)",
								}}
							>
								{o.description}
							</Text>
						) : null}
					</td>
					<td>
						{o.owner ? (
							<Box>
								<Text style={{ fontSize: 13 }}>
									{o.owner.name || "—"}
								</Text>
								<Text
									style={{
										fontSize: 12,
										color: "var(--Text-Secondary)",
									}}
								>
									{o.owner.email}
								</Text>
							</Box>
						) : (
							<Text style={{ color: "var(--Text-Secondary)" }}>
								—
							</Text>
						)}
					</td>
					<td>{o.memberCount}</td>
					<td>{o.propertyCount}</td>
					<td>{o.tenantCount}</td>
					<td>
						{o.suspended ? (
							<Badge $bg="var(--mr-color-danger-soft)" $fg="var(--mr-color-danger)">
								Suspended
							</Badge>
						) : (
							<Badge $bg="var(--mr-color-success-soft)" $fg="var(--mr-color-success)">
								Active
							</Badge>
						)}
					</td>
				</tr>
			)),
		[organizations, router],
	);

	return (
		<EntityPageStyled>
			<Box className="page-head">
				<Box className="titles">
					<Text className="title">Organizations</Text>
					<Text className="subtitle">
						Every organization on the platform.
					</Text>
				</Box>
			</Box>

			<Box className="stat-grid">
				<StatCard label="Total Organizations" value={total} />
			</Box>

			<Box className="toolbar">
				<input
					className="search"
					placeholder="Search organizations by name…"
					value={query}
					onChange={(e) => setQuery(e.target.value)}
				/>
			</Box>

			<Box className="panel">
				<Box className="table-scroll">
					<table>
						<thead>
							<tr>
								<th>Name</th>
								<th>Owner</th>
								<th>Members</th>
								<th>Properties</th>
								<th>Tenants</th>
								<th>Status</th>
							</tr>
						</thead>
						<tbody>{rows}</tbody>
					</table>
				</Box>
				{!isLoading && organizations.length === 0 ? (
					<Box className="empty">
						{search
							? "No organizations match your search."
							: "No organizations yet."}
					</Box>
				) : null}
				{isLoading && organizations.length === 0 ? (
					<Box className="empty">Loading…</Box>
				) : null}
			</Box>
		</EntityPageStyled>
	);
}

function OrganizationsWrapper() {
	return (
		<AdminShell>
			<OrganizationsContent />
		</AdminShell>
	);
}

export default memo(OrganizationsWrapper);
