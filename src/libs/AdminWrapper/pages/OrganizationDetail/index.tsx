"use client";
import Link from "next/link";
import { memo, useMemo, useState } from "react";
import { FiArrowLeft } from "react-icons/fi";
import { Box, Button, Loader, Text } from "@/components";
import { api } from "@/constants";
import { useAdminOrganizationDetail } from "@/hooks/Admin";
import { useToast } from "@/hooks";
import { Badge, EntityPageStyled, StatCard } from "../../../shared/entity";
import AdminShell from "../../AdminShell";

const naira = (n: number) => `₦${Math.round(n).toLocaleString("en-NG")}`;

function OrganizationDetailContent({ id }: { id: string }) {
	const { detail, isLoading, mutate } = useAdminOrganizationDetail(id);
	const toast = useToast();
	const [saving, setSaving] = useState(false);

	const memberRows = useMemo(
		() =>
			(detail?.members ?? []).map((m) => (
				<tr key={m.memberId}>
					<td>
						<Text style={{ fontWeight: 500 }}>{m.name || "—"}</Text>
					</td>
					<td>
						<Text
							style={{ fontSize: 13, color: "var(--Text-Secondary)" }}
						>
							{m.email || "—"}
						</Text>
					</td>
					<td>
						<Badge>{m.permission}</Badge>
					</td>
				</tr>
			)),
		[detail],
	);

	if (isLoading || !detail) {
		return (
			<EntityPageStyled>
				<Box style={{ height: 300 }}>
					<Loader loader="moonLoader" color="var(--mr-color-brand)" />
				</Box>
			</EntityPageStyled>
		);
	}

	const toggleSuspend = async () => {
		setSaving(true);
		try {
			await api().patch(`/api/admin/organizations/${id}`, {
				suspended: !detail.suspended,
			});
			toast.push(
				detail.suspended
					? "Organization reactivated"
					: "Organization suspended",
				{ type: "success" },
			);
			await mutate();
		} catch {
			toast.push("Could not update organization", { type: "warn" });
		} finally {
			setSaving(false);
		}
	};

	return (
		<EntityPageStyled>
			<Link
				href="/admin/organizations"
				style={{
					display: "inline-flex",
					alignItems: "center",
					gap: 6,
					color: "var(--Text-Secondary)",
					fontSize: 13,
					textDecoration: "none",
				}}
			>
				<FiArrowLeft size={14} /> Back to organizations
			</Link>

			<Box className="page-head">
				<Box className="titles">
					<Box
						style={{ display: "flex", alignItems: "center", gap: 12 }}
					>
						<Text className="title">{detail.name}</Text>
						{detail.suspended ? (
							<Badge
								$bg="var(--mr-color-danger-soft)"
								$fg="var(--mr-color-danger)"
							>
								Suspended
							</Badge>
						) : (
							<Badge
								$bg="var(--mr-color-success-soft)"
								$fg="var(--mr-color-success)"
							>
								Active
							</Badge>
						)}
					</Box>
					<Text className="subtitle">
						{detail.description || "No description."}
					</Text>
				</Box>
				<Button
					title={saving ? "Saving…" : detail.suspended ? "Reactivate" : "Suspend"}
					variant={detail.suspended ? "primary" : "danger"}
					disabled={saving}
					handleClick={toggleSuspend}
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
					Owner
				</Text>
				{detail.owner ? (
					<Box>
						<Text style={{ fontWeight: 600 }}>
							{detail.owner.name || "—"}
						</Text>
						<Text
							style={{ fontSize: 13, color: "var(--Text-Secondary)" }}
						>
							{detail.owner.email}
						</Text>
					</Box>
				) : (
					<Text style={{ color: "var(--Text-Secondary)" }}>
						No owner on record.
					</Text>
				)}
			</Box>

			<Box className="stat-grid">
				<StatCard label="Properties" value={detail.stats.properties} />
				<StatCard label="Units" value={detail.stats.units} />
				<StatCard
					label="Occupied Units"
					value={detail.stats.occupiedUnits}
				/>
				<StatCard label="Tenants" value={detail.stats.tenants} />
				<StatCard label="Revenue" value={naira(detail.stats.revenue)} />
			</Box>

			<Box className="panel">
				<Box className="table-scroll">
					<table>
						<thead>
							<tr>
								<th>Member</th>
								<th>Email</th>
								<th>Permission</th>
							</tr>
						</thead>
						<tbody>{memberRows}</tbody>
					</table>
				</Box>
				{detail.members.length === 0 ? (
					<Box className="empty">No members in this organization.</Box>
				) : null}
			</Box>
		</EntityPageStyled>
	);
}

function OrganizationDetailWrapper({ id }: { id: string }) {
	return (
		<AdminShell>
			<OrganizationDetailContent id={id} />
		</AdminShell>
	);
}

export default memo(OrganizationDetailWrapper);
