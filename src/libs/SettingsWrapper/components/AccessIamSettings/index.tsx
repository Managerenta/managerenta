"use client";
import { memo, useCallback, useMemo, useState } from "react";
import {
	FiAlertCircle,
	FiCheck,
	FiEdit2,
	FiPlus,
	FiShield,
	FiTrash2,
	FiX,
} from "react-icons/fi";
import { Box, Button, Input, Loader, Select, Text } from "@/components";
import {
	type IIamGroup,
	type IIamPolicy,
	useOrganizations,
	useOrgIam,
} from "@/hooks";
import { AccessIamSettingsStyled } from "./styled";

function ManagedByBadge({ managedBy }: { managedBy: "system" | "customer" }) {
	return <span className={`badge ${managedBy}`}>{managedBy}</span>;
}

function AccessIamSettings() {
	const { currentOrganizationId, role, current } = useOrganizations();
	const {
		roster,
		groups,
		policies,
		membershipMap,
		loading,
		forbidden,
		toggleMembership,
		createGroup,
		updateGroupPolicies,
		deleteGroup,
		createPolicy,
		updatePolicy,
		deletePolicy,
	} = useOrgIam(currentOrganizationId);

	// ---- local UI state ----
	const [newGroupName, setNewGroupName] = useState("");
	const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
	const [groupPolicySel, setGroupPolicySel] = useState<string[]>([]);

	const [newPolicyName, setNewPolicyName] = useState("");
	const [newPolicyJson, setNewPolicyJson] = useState(
		'{\n  "version": "2025-01-01",\n  "statements": [\n    {\n      "effect": "Allow",\n      "action": ["*"],\n      "resource": ["*"]\n    }\n  ]\n}',
	);
	const [newPolicyErr, setNewPolicyErr] = useState("");
	const [creatingPolicy, setCreatingPolicy] = useState(false);

	const [editingPolicyId, setEditingPolicyId] = useState<string | null>(null);
	const [editPolicyJson, setEditPolicyJson] = useState("");
	const [editPolicyErr, setEditPolicyErr] = useState("");

	const policyOptions = useMemo(
		() => policies.map((p) => ({ label: p.name, value: p._id })),
		[policies],
	);

	const parseDoc = useCallback((raw: string): unknown | null => {
		try {
			return JSON.parse(raw);
		} catch {
			return null;
		}
	}, []);

	const startEditGroup = useCallback((g: IIamGroup) => {
		setEditingGroupId(g._id);
		setGroupPolicySel(g.attachedPolicyIds ?? []);
	}, []);

	const handleCreateGroup = useCallback(async () => {
		if (!newGroupName.trim()) return;
		const ok = await createGroup(newGroupName.trim());
		if (ok) setNewGroupName("");
	}, [newGroupName, createGroup]);

	const handleSaveGroupPolicies = useCallback(async () => {
		if (!editingGroupId) return;
		const ok = await updateGroupPolicies(editingGroupId, groupPolicySel);
		if (ok) setEditingGroupId(null);
	}, [editingGroupId, groupPolicySel, updateGroupPolicies]);

	const handleCreatePolicy = useCallback(async () => {
		if (!newPolicyName.trim()) {
			setNewPolicyErr("A name is required");
			return;
		}
		const doc = parseDoc(newPolicyJson);
		if (!doc || typeof doc !== "object") {
			setNewPolicyErr("Document is not valid JSON");
			return;
		}
		setNewPolicyErr("");
		setCreatingPolicy(true);
		try {
			const ok = await createPolicy(
				newPolicyName.trim(),
				doc as IIamPolicy["document"],
			);
			if (ok) {
				setNewPolicyName("");
			}
		} finally {
			setCreatingPolicy(false);
		}
	}, [newPolicyName, newPolicyJson, parseDoc, createPolicy]);

	const startEditPolicy = useCallback((p: IIamPolicy) => {
		setEditingPolicyId(p._id);
		setEditPolicyJson(JSON.stringify(p.document, null, 2));
		setEditPolicyErr("");
	}, []);

	const handleSavePolicy = useCallback(async () => {
		if (!editingPolicyId) return;
		const doc = parseDoc(editPolicyJson);
		if (!doc || typeof doc !== "object") {
			setEditPolicyErr("Document is not valid JSON");
			return;
		}
		setEditPolicyErr("");
		const ok = await updatePolicy(
			editingPolicyId,
			doc as IIamPolicy["document"],
		);
		if (ok) setEditingPolicyId(null);
	}, [editingPolicyId, editPolicyJson, parseDoc, updatePolicy]);

	// ---- gating / states ----
	if (!currentOrganizationId) {
		return (
			<AccessIamSettingsStyled>
				<Box className="notice">
					<FiAlertCircle size={20} />
					<Text>
						Access &amp; IAM management is only available inside an
						organization. Switch to an organization workspace from
						the Organizations tab.
					</Text>
				</Box>
			</AccessIamSettingsStyled>
		);
	}

	if (forbidden || role !== "admin") {
		return (
			<AccessIamSettingsStyled>
				<Box className="notice">
					<FiAlertCircle size={20} />
					<Text>
						You need admin access to manage IAM groups, policies and
						member assignments for this organization.
					</Text>
				</Box>
			</AccessIamSettingsStyled>
		);
	}

	if (loading) {
		return (
			<AccessIamSettingsStyled>
				<Box
					style={{
						display: "flex",
						justifyContent: "center",
						padding: "48px 0",
					}}
				>
					<Loader loader="moonLoader" color="var(--Main-Blue)" />
				</Box>
			</AccessIamSettingsStyled>
		);
	}

	return (
		<AccessIamSettingsStyled>
			{/* ---- Member -> Group matrix ---- */}
			<Box className="section">
				<Box className="section-header">
					<Box>
						<Text className="section-title">
							Member access{current ? ` — ${current.name}` : ""}
						</Text>
						<Text className="caption">
							Toggle which IAM group each member belongs to.
							Changes take effect immediately.
						</Text>
					</Box>
					<FiShield />
				</Box>

				{roster.length === 0 || groups.length === 0 ? (
					<Text className="empty">
						{roster.length === 0
							? "No members in this organization yet."
							: "No IAM groups exist yet. Create one below."}
					</Text>
				) : (
					<Box className="matrix-scroll">
						<table className="matrix">
							<thead>
								<tr>
									<th className="member-col">Member</th>
									{groups.map((g) => (
										<th key={g._id}>
											<span className="group-head">
												<span className="group-name">
													{g.name}
												</span>
												<ManagedByBadge
													managedBy={g.managedBy}
												/>
											</span>
										</th>
									))}
								</tr>
							</thead>
							<tbody>
								{roster.map((m) => {
									const owned =
										membershipMap[m.memberId] ??
										new Set<string>();
									return (
										<tr key={m.memberId}>
											<td className="member-col">
												<Text className="member-name">
													{m.name}
												</Text>
												<Text className="member-email">
													{m.email}
												</Text>
											</td>
											{groups.map((g) => {
												const isMember = owned.has(
													g._id,
												);
												return (
													<td key={g._id}>
														<input
															type="checkbox"
															checked={isMember}
															onChange={() =>
																toggleMembership(
																	g._id,
																	m.memberId,
																	isMember,
																)
															}
														/>
													</td>
												);
											})}
										</tr>
									);
								})}
							</tbody>
						</table>
					</Box>
				)}
			</Box>

			{/* ---- Groups panel ---- */}
			<Box className="section">
				<Box className="section-header">
					<Box>
						<Text className="section-title">Groups</Text>
						<Text className="caption">
							System groups are read-only. Create custom groups and
							attach policies to them.
						</Text>
					</Box>
				</Box>

				<Box className="form-row">
					<Input
						type="text"
						value={newGroupName}
						placeholder="New group name (e.g. Accountants)"
						onChange={(e) => setNewGroupName(e.target.value)}
					/>
					<Button
						type="button"
						title={
							<Box className="btn-inner">
								<FiPlus size={14} /> <span>Create group</span>
							</Box>
						}
						handleClick={handleCreateGroup}
						background="var(--Main-Blue)"
						color="white"
						borderRadius="8px"
					/>
				</Box>

				<Box className="list">
					{groups.map((g) => {
						const isCustomer = g.managedBy === "customer";
						const isEditing = editingGroupId === g._id;
						return (
							<Box key={g._id} className="row-wrap">
								<Box className="row">
									<Box className="row-main">
										<Box className="row-title">
											{g.name}
											<ManagedByBadge
												managedBy={g.managedBy}
											/>
										</Box>
										<Text className="row-sub">
											{g.attachedPolicyIds?.length ?? 0}{" "}
											{(g.attachedPolicyIds?.length ??
												0) === 1
												? "policy"
												: "policies"}{" "}
											attached
										</Text>
									</Box>
									<Box className="row-actions">
										<Box
											className={`icon-btn ${
												isCustomer ? "" : "disabled"
											}`}
											title={
												isCustomer
													? "Edit attached policies"
													: "System group (read-only)"
											}
											onClick={() =>
												isCustomer &&
												(isEditing
													? setEditingGroupId(null)
													: startEditGroup(g))
											}
										>
											<FiEdit2 size={14} />
										</Box>
										<Box
											className={`icon-btn danger ${
												isCustomer ? "" : "disabled"
											}`}
											title={
												isCustomer
													? "Delete group"
													: "System group (read-only)"
											}
											onClick={() =>
												isCustomer && deleteGroup(g._id)
											}
										>
											<FiTrash2 size={14} />
										</Box>
									</Box>
								</Box>

								{isEditing && isCustomer && (
									<Box className="editor">
										<Text className="caption">
											Attached policies
										</Text>
										<Select
											className="multi-select"
											isMulti
											isSearchable
											placeholder="Select policies…"
											options={policyOptions}
											value={groupPolicySel}
											onChange={() => {}}
											onChangeMulti={(vals) =>
												setGroupPolicySel(vals)
											}
										/>
										<Box className="editor-actions">
											<Button
												type="button"
												title={
													<Box className="btn-inner">
														<FiCheck size={14} />{" "}
														<span>Save</span>
													</Box>
												}
												handleClick={
													handleSaveGroupPolicies
												}
												background="var(--Main-Blue)"
												color="white"
												borderRadius="8px"
											/>
											<Button
												type="button"
												title={
													<Box className="btn-inner">
														<FiX size={14} />{" "}
														<span>Cancel</span>
													</Box>
												}
												handleClick={() =>
													setEditingGroupId(null)
												}
												variant="secondary"
												borderRadius="8px"
											/>
										</Box>
									</Box>
								)}
							</Box>
						);
					})}
					{groups.length === 0 && (
						<Text className="empty">No groups yet.</Text>
					)}
				</Box>
			</Box>

			{/* ---- Policies panel ---- */}
			<Box className="section">
				<Box className="section-header">
					<Box>
						<Text className="section-title">Policies</Text>
						<Text className="caption">
							System policies are read-only. Custom policy
							documents must be valid JSON.
						</Text>
					</Box>
				</Box>

				<Box className="editor">
					<Text className="caption">Create a custom policy</Text>
					<Box className="form-row">
						<Input
							type="text"
							value={newPolicyName}
							placeholder="Policy name (e.g. ReadOnlyTenants)"
							onChange={(e) => setNewPolicyName(e.target.value)}
						/>
					</Box>
					<textarea
						className="json"
						value={newPolicyJson}
						spellCheck={false}
						onChange={(e) => setNewPolicyJson(e.target.value)}
					/>
					{newPolicyErr && (
						<Text className="error-text">{newPolicyErr}</Text>
					)}
					<Box className="editor-actions">
						<Button
							type="button"
							title={
								<Box className="btn-inner">
									<FiPlus size={14} />{" "}
									<span>
										{creatingPolicy
											? "Creating…"
											: "Create policy"}
									</span>
								</Box>
							}
							disabled={creatingPolicy}
							handleClick={handleCreatePolicy}
							background="var(--Main-Blue)"
							color="white"
							borderRadius="8px"
						/>
					</Box>
				</Box>

				<Box className="list">
					{policies.map((p) => {
						const isCustomer = p.managedBy === "customer";
						const isEditing = editingPolicyId === p._id;
						const stmtCount = p.document?.statements?.length ?? 0;
						return (
							<Box key={p._id} className="row-wrap">
								<Box className="row">
									<Box className="row-main">
										<Box className="row-title">
											{p.name}
											<ManagedByBadge
												managedBy={p.managedBy}
											/>
										</Box>
										<Text className="row-sub">
											{stmtCount}{" "}
											{stmtCount === 1
												? "statement"
												: "statements"}
										</Text>
									</Box>
									<Box className="row-actions">
										<Box
											className={`icon-btn ${
												isCustomer ? "" : "disabled"
											}`}
											title={
												isCustomer
													? "Edit policy document"
													: "System policy (read-only)"
											}
											onClick={() =>
												isCustomer &&
												(isEditing
													? setEditingPolicyId(null)
													: startEditPolicy(p))
											}
										>
											<FiEdit2 size={14} />
										</Box>
										<Box
											className={`icon-btn danger ${
												isCustomer ? "" : "disabled"
											}`}
											title={
												isCustomer
													? "Delete policy"
													: "System policy (read-only)"
											}
											onClick={() =>
												isCustomer &&
												deletePolicy(p._id)
											}
										>
											<FiTrash2 size={14} />
										</Box>
									</Box>
								</Box>

								{isEditing && isCustomer && (
									<Box className="editor">
										<textarea
											className="json"
											value={editPolicyJson}
											spellCheck={false}
											onChange={(e) =>
												setEditPolicyJson(
													e.target.value,
												)
											}
										/>
										{editPolicyErr && (
											<Text className="error-text">
												{editPolicyErr}
											</Text>
										)}
										<Box className="editor-actions">
											<Button
												type="button"
												title={
													<Box className="btn-inner">
														<FiCheck size={14} />{" "}
														<span>Save</span>
													</Box>
												}
												handleClick={handleSavePolicy}
												background="var(--Main-Blue)"
												color="white"
												borderRadius="8px"
											/>
											<Button
												type="button"
												title={
													<Box className="btn-inner">
														<FiX size={14} />{" "}
														<span>Cancel</span>
													</Box>
												}
												handleClick={() =>
													setEditingPolicyId(null)
												}
												variant="secondary"
												borderRadius="8px"
											/>
										</Box>
									</Box>
								)}
							</Box>
						);
					})}
					{policies.length === 0 && (
						<Text className="empty">No policies yet.</Text>
					)}
				</Box>
			</Box>
		</AccessIamSettingsStyled>
	);
}

export default memo(AccessIamSettings);
