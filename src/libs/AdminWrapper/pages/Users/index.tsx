"use client";
import { memo, useEffect, useMemo, useState } from "react";
import { FiChevronDown, FiChevronRight } from "react-icons/fi";
import { mutate as globalMutate } from "swr";
import { Box, Button, Input, Select, Text } from "@/components";
import { api } from "@/constants";
import { useToast } from "@/hooks";
import {
	type IAdminUserRow,
	useAdminUserDetail,
	useAdminUsers,
	useOrgGroups,
} from "@/hooks/Admin";
import { Badge, StatCard } from "../../../shared/entity";
import AdminShell from "../../AdminShell";
import { UsersStyled } from "./styled";

function errMessage(e: unknown, fallback: string): string {
	const msg = (e as { response?: { data?: { message?: string } } })?.response
		?.data?.message;
	return typeof msg === "string" ? msg : fallback;
}

function StatusBadge({ status }: { status: "active" | "suspended" }) {
	return status === "active" ? (
		<Badge $bg="var(--mr-color-success-soft)" $fg="var(--mr-color-success)">
			active
		</Badge>
	) : (
		<Badge $bg="var(--mr-color-danger-soft)" $fg="var(--mr-color-danger)">
			suspended
		</Badge>
	);
}

function MembershipPanel({ userId }: { userId: string }) {
	const { detail, isLoading, mutate } = useAdminUserDetail(userId);
	const { orgGroups } = useOrgGroups();
	const toast = useToast();
	const [selected, setSelected] = useState("");
	const [busy, setBusy] = useState(false);

	const memberships = detail?.memberships ?? [];
	const memberGroupIds = useMemo(
		() => new Set(memberships.map((m) => m.groupId)),
		[memberships],
	);

	const options = useMemo(
		() =>
			orgGroups
				.filter((g) => !memberGroupIds.has(g.groupId))
				.map((g) => ({
					label: `${g.orgName} · ${g.name}`,
					value: g.groupId,
				})),
		[orgGroups, memberGroupIds],
	);

	const addToGroup = async () => {
		if (!selected) {
			toast.push("Pick a group to add", { type: "warn" });
			return;
		}
		setBusy(true);
		try {
			await api().post(`/api/admin/users/${userId}/memberships`, {
				groupId: selected,
			});
			toast.push("Added to group", { type: "success" });
			setSelected("");
			await mutate();
		} catch (e) {
			toast.push(errMessage(e, "Could not add to group"), {
				type: "warn",
			});
		} finally {
			setBusy(false);
		}
	};

	const removeFromGroup = async (groupId: string) => {
		try {
			await api().delete(
				`/api/admin/users/${userId}/memberships?groupId=${groupId}`,
			);
			toast.push("Removed from group", { type: "success" });
			await mutate();
		} catch (e) {
			toast.push(errMessage(e, "Could not remove from group"), {
				type: "warn",
			});
		}
	};

	return (
		<Box className="sub-block" data-testid="membership-panel">
			<Text className="sub-title">Group memberships</Text>
			{memberships.map((m) => (
				<Box key={m.groupId} className="member-row">
					<Box>
						<Text style={{ fontSize: 13, fontWeight: 500 }}>
							{m.groupName}
						</Text>
						<Text
							style={{
								fontSize: 12,
								color: "var(--Text-Secondary)",
							}}
						>
							{m.orgName}
						</Text>
					</Box>
					<button
						type="button"
						className="link-btn danger"
						onClick={() => removeFromGroup(m.groupId)}
					>
						Remove
					</button>
				</Box>
			))}
			{!isLoading && memberships.length === 0 ? (
				<Text style={{ fontSize: 13, color: "var(--Text-Secondary)" }}>
					Not a member of any group.
				</Text>
			) : null}
			<Box className="inline-form">
				<Box className="grow">
					<Select
						options={options}
						value={selected}
						onChange={setSelected}
						placeholder="Add to an org group…"
					/>
				</Box>
				<Button
					title="Add"
					variant="soft"
					size="sm"
					disabled={busy}
					handleClick={addToGroup}
				/>
			</Box>
		</Box>
	);
}

function UserCard({ user, listKey }: { user: IAdminUserRow; listKey: string }) {
	const toast = useToast();
	const [expanded, setExpanded] = useState(false);
	const [busy, setBusy] = useState(false);

	const toggleStatus = async () => {
		const next = user.status === "active" ? "suspended" : "active";
		setBusy(true);
		try {
			await api().patch(`/api/admin/users/${user.id}`, { status: next });
			toast.push(
				next === "suspended" ? "User suspended" : "User reactivated",
				{ type: "success" },
			);
			await globalMutate(listKey);
		} catch (e) {
			toast.push(errMessage(e, "Could not update user"), {
				type: "warn",
			});
		} finally {
			setBusy(false);
		}
	};

	return (
		<Box className="user-card" data-testid="user-card">
			<Box className="card-top">
				<Box>
					<Text className="card-name">
						{user.name || "Unnamed user"}
					</Text>
					<Text className="card-meta">
						{user.email} · @{user.username} ·{" "}
						{new Date(user.createdAt).toLocaleDateString("en-NG")}
					</Text>
				</Box>
				<Box className="card-actions">
					<StatusBadge status={user.status} />
					<Button
						title={
							user.status === "active" ? "Suspend" : "Reactivate"
						}
						variant={
							user.status === "active" ? "danger-soft" : "soft"
						}
						size="sm"
						disabled={busy}
						handleClick={toggleStatus}
					/>
				</Box>
			</Box>

			<button
				type="button"
				className="link-btn"
				onClick={() => setExpanded((v) => !v)}
			>
				{expanded ? (
					<FiChevronDown size={14} />
				) : (
					<FiChevronRight size={14} />
				)}
				{expanded ? "Hide groups" : "Manage groups"}
			</button>
			{expanded ? <MembershipPanel userId={user.id} /> : null}
		</Box>
	);
}

function UsersContent() {
	const [query, setQuery] = useState("");
	const [search, setSearch] = useState("");

	useEffect(() => {
		const t = setTimeout(() => setSearch(query.trim()), 350);
		return () => clearTimeout(t);
	}, [query]);

	const { users, total, isLoading, mutateKey } = useAdminUsers(search);

	return (
		<UsersStyled>
			<Box className="page-head">
				<Text className="title">Users</Text>
				<Text className="subtitle">
					Every end-user on the platform. Suspend access or manage a
					user's organization group memberships.
				</Text>
			</Box>

			<Box style={{ maxWidth: 260 }}>
				<StatCard label="Total Users" value={total} />
			</Box>

			<Box className="toolbar">
				<Input
					className="search"
					placeholder="Search users by name, email or username…"
					value={query}
					onChange={(e) => setQuery(e.target.value)}
				/>
			</Box>

			<Box className="cards">
				{users.map((u) => (
					<UserCard key={u.id} user={u} listKey={mutateKey} />
				))}
				{!isLoading && users.length === 0 ? (
					<Box className="empty">
						{search
							? "No users match your search."
							: "No users yet."}
					</Box>
				) : null}
				{isLoading && users.length === 0 ? (
					<Box className="empty">Loading…</Box>
				) : null}
			</Box>
		</UsersStyled>
	);
}

function UsersWrapper() {
	return (
		<AdminShell>
			<UsersContent />
		</AdminShell>
	);
}

export default memo(UsersWrapper);
