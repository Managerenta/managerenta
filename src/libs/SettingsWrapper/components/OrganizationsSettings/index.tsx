"use client";
import { memo, useCallback, useMemo, useState } from "react";
import { FiCheck, FiPlus, FiTrash2, FiUsers, FiX } from "react-icons/fi";
import { toast } from "react-toastify";
import useSWR from "swr";
import { Box, Button, Input, Text } from "@/components";
import { api, fetcher, getErrorMessage } from "@/constants";
import { useOrganizations } from "@/hooks";
import { OrganizationsSettingsStyled } from "./styled";

interface MemberRow {
	memberId: string;
	name: string;
	email: string;
	avatar: string | null;
	permission: "admin" | "manager" | "viewer";
}
interface InviteRow {
	email: string;
	token: string;
	role: "admin" | "manager" | "viewer";
	expiresAt: string;
}

interface MembersResponse {
	data?: {
		ownerId: string;
		members: MemberRow[];
		invites: InviteRow[];
	};
}

function OrganizationsSettings() {
	const {
		organizations,
		currentOrganizationId,
		current,
		role,
		switchTo,
		create,
	} = useOrganizations();

	const [newName, setNewName] = useState("");
	const [newDesc, setNewDesc] = useState("");
	const [creating, setCreating] = useState(false);
	const [inviteEmail, setInviteEmail] = useState("");
	const [inviteRole, setInviteRole] = useState<
		"admin" | "manager" | "viewer"
	>("manager");
	const [inviting, setInviting] = useState(false);

	const orgIdForMembers = useMemo(
		() => currentOrganizationId,
		[currentOrganizationId],
	);
	const { data: membersData, mutate: refreshMembers } =
		useSWR<MembersResponse>(
			orgIdForMembers
				? `/api/organizations/${orgIdForMembers}/members`
				: null,
			fetcher,
			{ revalidateOnMount: true },
		);

	const handleCreate = useCallback(async () => {
		if (!newName.trim() || !newDesc.trim()) {
			toast.error("Name and description are required");
			return;
		}
		setCreating(true);
		try {
			const ok = await create({
				name: newName.trim(),
				description: newDesc.trim(),
			});
			if (ok) {
				setNewName("");
				setNewDesc("");
			}
		} finally {
			setCreating(false);
		}
	}, [newName, newDesc, create]);

	const handleInvite = useCallback(async () => {
		if (!orgIdForMembers || !inviteEmail.trim()) return;
		setInviting(true);
		try {
			await api().post(`/api/organizations/${orgIdForMembers}/members`, {
				email: inviteEmail.trim(),
				role: inviteRole,
			});
			setInviteEmail("");
			await refreshMembers();
			toast.success("Invitation sent");
		} catch (err) {
			toast.error(getErrorMessage(err, "Failed to invite"));
		} finally {
			setInviting(false);
		}
	}, [orgIdForMembers, inviteEmail, inviteRole, refreshMembers]);

	const handleRevokeInvite = useCallback(
		async (token: string) => {
			if (!orgIdForMembers) return;
			try {
				await api().delete(
					`/api/organizations/${orgIdForMembers}/invites/${token}`,
				);
				await refreshMembers();
				toast.success("Invitation revoked");
			} catch (err) {
				toast.error(getErrorMessage(err, "Failed to revoke"));
			}
		},
		[orgIdForMembers, refreshMembers],
	);

	const handleRemoveMember = useCallback(
		async (memberId: string) => {
			if (!orgIdForMembers) return;
			try {
				await api().delete(
					`/api/organizations/${orgIdForMembers}/members/${memberId}`,
				);
				await refreshMembers();
				toast.success("Member removed");
			} catch (err) {
				toast.error(getErrorMessage(err, "Failed to remove member"));
			}
		},
		[orgIdForMembers, refreshMembers],
	);

	const handleRoleChange = useCallback(
		async (memberId: string, next: "admin" | "manager" | "viewer") => {
			if (!orgIdForMembers) return;
			try {
				await api().patch(
					`/api/organizations/${orgIdForMembers}/members/${memberId}`,
					{ role: next },
				);
				await refreshMembers();
				toast.success("Role updated");
			} catch (err) {
				toast.error(getErrorMessage(err, "Failed to update role"));
			}
		},
		[orgIdForMembers, refreshMembers],
	);

	const isAdmin = role === "admin" || !currentOrganizationId;

	return (
		<OrganizationsSettingsStyled>
			<Box className="section">
				<Text className="section-title">Active workspace</Text>
				<Box className="orgs-list">
					<Box
						className={`org-pill ${
							!currentOrganizationId ? "active" : ""
						}`}
						onClick={() => switchTo(null)}
					>
						<Box className="org-avatar">Me</Box>
						<Box className="org-meta">
							<Text className="org-name">Personal workspace</Text>
							<Text className="org-role">owner</Text>
						</Box>
						{!currentOrganizationId && <FiCheck />}
					</Box>
					{organizations.map((o) => {
						const id = o._id ?? o.id ?? "";
						return (
							<Box
								key={id}
								className={`org-pill ${
									currentOrganizationId === id ? "active" : ""
								}`}
								onClick={() => switchTo(id)}
							>
								<Box className="org-avatar">
									{o.name.slice(0, 2).toUpperCase()}
								</Box>
								<Box className="org-meta">
									<Text className="org-name">{o.name}</Text>
									<Text className="org-role">
										{o.ownerId === currentOrganizationId
											? "owner"
											: "member"}
									</Text>
								</Box>
								{currentOrganizationId === id && <FiCheck />}
							</Box>
						);
					})}
				</Box>
				{current && (
					<Text className="caption">
						Switching activates the workspace's properties, tenants
						and transactions across the app.
					</Text>
				)}
			</Box>

			<Box className="section">
				<Text className="section-title">Create a new organization</Text>
				<Box className="form-field">
					<Text className="field-label">Name</Text>
					<Input
						type="text"
						value={newName}
						placeholder="e.g. Lekki Holdings"
						onChange={(e) => setNewName(e.target.value)}
					/>
				</Box>
				<Box className="form-field">
					<Text className="field-label">Description</Text>
					<Input
						type="text"
						value={newDesc}
						placeholder="What does this org manage?"
						onChange={(e) => setNewDesc(e.target.value)}
					/>
				</Box>
				<Box className="action-btn">
					<Button
						type="button"
						title={creating ? "Creating…" : "Create organization"}
						disabled={creating}
						handleClick={handleCreate}
						background="var(--Main-Blue)"
						color="white"
						borderRadius="8px"
					/>
				</Box>
			</Box>

			{current && (
				<Box className="section">
					<Box className="section-header">
						<Box>
							<Text className="section-title">
								Members of {current.name}
							</Text>
							<Text className="caption">
								Manage who can access this organization. Admins
								can invite, remove, and change roles.
							</Text>
						</Box>
						<FiUsers />
					</Box>

					{isAdmin && (
						<Box className="invite-row">
							<Input
								type="email"
								value={inviteEmail}
								placeholder="teammate@example.com"
								onChange={(e) => setInviteEmail(e.target.value)}
							/>
							<select
								value={inviteRole}
								onChange={(e) =>
									setInviteRole(
										e.target.value as
											| "admin"
											| "manager"
											| "viewer",
									)
								}
							>
								<option value="admin">Admin</option>
								<option value="manager">Manager</option>
								<option value="viewer">Viewer</option>
							</select>
							<Button
								type="button"
								title={
									<Box className="btn-inner">
										<FiPlus size={14} />
										<span>
											{inviting ? "Inviting…" : "Invite"}
										</span>
									</Box>
								}
								disabled={inviting}
								handleClick={handleInvite}
								background="var(--Main-Blue)"
								color="white"
								borderRadius="8px"
							/>
						</Box>
					)}

					<Box className="members-table">
						<Text className="members-section-label">Members</Text>
						{(membersData?.data?.members ?? []).map((m) => (
							<Box key={m.memberId} className="member-row">
								<Box className="member-info">
									<Text className="member-name">
										{m.name}
									</Text>
									<Text className="member-email">
										{m.email}
									</Text>
								</Box>
								{isAdmin ? (
									<select
										value={m.permission}
										onChange={(e) =>
											handleRoleChange(
												m.memberId,
												e.target.value as
													| "admin"
													| "manager"
													| "viewer",
											)
										}
									>
										<option value="admin">Admin</option>
										<option value="manager">Manager</option>
										<option value="viewer">Viewer</option>
									</select>
								) : (
									<Text className="member-role">
										{m.permission}
									</Text>
								)}
								{isAdmin &&
									m.memberId !==
										(membersData?.data?.ownerId ?? "") && (
										<Box
											className="remove-btn"
											onClick={() =>
												handleRemoveMember(m.memberId)
											}
										>
											<FiTrash2 size={14} />
										</Box>
									)}
							</Box>
						))}

						{(membersData?.data?.invites ?? []).length > 0 && (
							<>
								<Text className="members-section-label">
									Pending invites
								</Text>
								{(membersData?.data?.invites ?? []).map((i) => (
									<Box key={i.token} className="member-row">
										<Box className="member-info">
											<Text className="member-name">
												{i.email}
											</Text>
											<Text className="member-email">
												expires{" "}
												{new Date(
													i.expiresAt,
												).toLocaleDateString()}
											</Text>
										</Box>
										<Text className="member-role">
											{i.role}
										</Text>
										{isAdmin && (
											<Box
												className="remove-btn"
												onClick={() =>
													handleRevokeInvite(i.token)
												}
											>
												<FiX size={14} />
											</Box>
										)}
									</Box>
								))}
							</>
						)}
					</Box>
				</Box>
			)}

			<Box className="section">
				<Text className="caption">
					Tip: share your invite link with a teammate; they sign up or
					sign in and visit{" "}
					<a className="link" href="/invitations">
						/invitations
					</a>{" "}
					to accept.
				</Text>
			</Box>
		</OrganizationsSettingsStyled>
	);
}

export default memo(OrganizationsSettings);
