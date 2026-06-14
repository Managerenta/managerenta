"use client";
import { memo, useMemo, useState } from "react";
import { Box, Select, Text } from "@/components";
import { useAudit } from "@/hooks";
import { Badge, EntityPageStyled, StatCard } from "../shared/entity";
import {
	ACTION_COLORS,
	auditActionFilterOptions,
	auditEntityFilterOptions,
	titleCase,
} from "../shared/options";

function AuditWrapper() {
	const [actionFilter, setActionFilter] = useState("all");
	const [entityFilter, setEntityFilter] = useState("all");

	const { events, total, isLoading } = useAudit({
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
						<td>
							<Text
								style={{
									fontSize: 12,
									color: "var(--Text-Secondary)",
								}}
							>
								{e.ip ?? "—"}
							</Text>
						</td>
					</tr>
				);
			}),
		[events],
	);

	return (
		<EntityPageStyled>
			<Box className="page-head">
				<Box className="titles">
					<Text className="title">Audit Log</Text>
					<Text className="subtitle">
						A record of important actions across your workspace.
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

export default memo(AuditWrapper);
