"use client";
import { memo, useMemo, useState } from "react";
import { Box, Select, Text } from "@/components";
import { useAdminAudit } from "@/hooks/Admin";
import { Badge, EntityPageStyled, StatCard } from "../../../shared/entity";
import {
	ACTION_COLORS,
	auditActionFilterOptions,
	auditEntityFilterOptions,
	titleCase,
} from "../../../shared/options";
import AdminShell from "../../AdminShell";

const mono = (v?: string) => (
	<Text
		style={{
			fontSize: 12,
			color: "var(--Text-Secondary)",
			fontFamily: "monospace",
		}}
	>
		{v || "—"}
	</Text>
);

function AuditContent() {
	const [actionFilter, setActionFilter] = useState("all");
	const [entityFilter, setEntityFilter] = useState("all");
	const { events, total, isLoading } = useAdminAudit({
		action: actionFilter,
		entityType: entityFilter,
	});

	const rows = useMemo(
		() =>
			events.map((e) => {
				const ac = ACTION_COLORS[e.action];
				return (
					<tr key={e.id}>
						<td>
							<Text style={{ fontSize: 13 }}>
								{new Date(e.createdAt).toLocaleString("en-NG")}
							</Text>
						</td>
						<td>
							<Badge $bg={ac?.bg} $fg={ac?.fg}>
								{titleCase(e.action)}
							</Badge>
						</td>
						<td>
							<Text style={{ textTransform: "capitalize" }}>
								{e.entityType}
							</Text>
						</td>
						<td>{mono(e.actorId)}</td>
						<td>{mono(e.ownerId)}</td>
						<td>{mono(e.organizationId)}</td>
						<td>
							<Text
								style={{
									fontSize: 13,
									color: "var(--Text-Secondary)",
								}}
							>
								{e.description ?? "—"}
							</Text>
						</td>
						<td>{mono(e.ip)}</td>
					</tr>
				);
			}),
		[events],
	);

	return (
		<EntityPageStyled>
			<Box className="page-head">
				<Box className="titles">
					<Text className="title">Platform Audit Log</Text>
					<Text className="subtitle">
						Cross-tenant record of important actions.
					</Text>
				</Box>
			</Box>

			<Box className="stat-grid">
				<StatCard label="Recorded Events" value={total} />
			</Box>

			<Box className="toolbar">
				<Box className="filter">
					<Select
						options={auditActionFilterOptions}
						value={actionFilter}
						onChange={setActionFilter}
						isSearchable={false}
						placeholder="Action"
					/>
				</Box>
				<Box className="filter">
					<Select
						options={auditEntityFilterOptions}
						value={entityFilter}
						onChange={setEntityFilter}
						isSearchable={false}
						placeholder="Entity"
					/>
				</Box>
			</Box>

			<Box className="panel">
				<Box className="table-scroll">
					<table>
						<thead>
							<tr>
								<th>When</th>
								<th>Action</th>
								<th>Entity</th>
								<th>Actor</th>
								<th>Owner</th>
								<th>Organization</th>
								<th>Description</th>
								<th>IP</th>
							</tr>
						</thead>
						<tbody>{rows}</tbody>
					</table>
				</Box>
				{!isLoading && events.length === 0 ? (
					<Box className="empty">No audit events recorded yet.</Box>
				) : null}
			</Box>
		</EntityPageStyled>
	);
}

function AuditWrapper() {
	return (
		<AdminShell>
			<AuditContent />
		</AdminShell>
	);
}

export default memo(AuditWrapper);
