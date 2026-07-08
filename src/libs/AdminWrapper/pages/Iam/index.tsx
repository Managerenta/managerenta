"use client";
import { memo, useMemo, useState } from "react";
import { FiChevronDown, FiChevronRight, FiTrash2 } from "react-icons/fi";
import { mutate as globalMutate } from "swr";
import { Box, Button, Select, Text } from "@/components";
import { api } from "@/constants";
import { useToast } from "@/hooks";
import {
	type IAdminGroup,
	type IAdminPolicy,
	useAdminGroupMembers,
	useAdminGroups,
	useAdminOperators,
	useAdminPolicies,
} from "@/hooks/Admin";
import { Badge } from "../../../shared/entity";
import AdminShell from "../../AdminShell";
import { IamStyled } from "./styled";

const OBJECT_ID = /^[0-9a-fA-F]{24}$/;

function errMessage(e: unknown, fallback: string): string {
	const msg = (e as { response?: { data?: { message?: string } } })?.response
		?.data?.message;
	return typeof msg === "string" ? msg : fallback;
}

function ManagedBadge({ managedBy }: { managedBy: string }) {
	return managedBy === "system" ? (
		<Badge $bg="var(--mr-color-brand-soft)" $fg="var(--mr-color-brand)">
			system
		</Badge>
	) : (
		<Badge>customer</Badge>
	);
}

// ── Operators ────────────────────────────────────────────────────────────────
function OperatorsSection() {
	const { operators, isLoading, mutateKey } = useAdminOperators();
	const toast = useToast();
	const [userId, setUserId] = useState("");
	const [busy, setBusy] = useState(false);

	const addOperator = async () => {
		if (!OBJECT_ID.test(userId.trim())) {
			toast.push("Enter a valid 24-character user id", { type: "warn" });
			return;
		}
		setBusy(true);
		try {
			await api().post("/api/admin/iam/operators", {
				userId: userId.trim(),
			});
			toast.push("Operator added", { type: "success" });
			setUserId("");
			await globalMutate(mutateKey);
		} catch (e) {
			toast.push(errMessage(e, "Could not add operator"), {
				type: "warn",
			});
		} finally {
			setBusy(false);
		}
	};

	const toggleStatus = async (id: string, status: "active" | "disabled") => {
		const next = status === "active" ? "disabled" : "active";
		try {
			await api().patch(`/api/admin/iam/operators/${id}`, {
				status: next,
			});
			toast.push(
				next === "active" ? "Operator enabled" : "Operator disabled",
				{
					type: "success",
				},
			);
			await globalMutate(mutateKey);
		} catch (e) {
			toast.push(errMessage(e, "Could not update operator"), {
				type: "warn",
			});
		}
	};

	return (
		<Box className="section">
			<Box className="create-row">
				<input
					placeholder="User id (24-char ObjectId) to promote to operator"
					value={userId}
					onChange={(e) => setUserId(e.target.value)}
				/>
				<Button
					title="Add operator"
					variant="primary"
					disabled={busy}
					handleClick={addOperator}
				/>
			</Box>

			<Box className="cards">
				{operators.map((o) => (
					<Box key={o.userId} className="iam-card">
						<Box className="card-top">
							<Box>
								<Text className="card-name">
									{o.name || "Unnamed user"}
								</Text>
								<Text className="card-meta">
									{o.email || o.userId} ·{" "}
									{o.createdAt
										? new Date(
												o.createdAt,
											).toLocaleDateString("en-NG")
										: "—"}
								</Text>
							</Box>
							<Box className="card-actions">
								{o.status === "active" ? (
									<Badge
										$bg="var(--mr-color-success-soft)"
										$fg="var(--mr-color-success)"
									>
										active
									</Badge>
								) : (
									<Badge
										$bg="var(--mr-color-danger-soft)"
										$fg="var(--mr-color-danger)"
									>
										disabled
									</Badge>
								)}
								<Button
									title={
										o.status === "active"
											? "Disable"
											: "Enable"
									}
									variant={
										o.status === "active"
											? "danger-soft"
											: "soft"
									}
									size="sm"
									handleClick={() =>
										toggleStatus(o.userId, o.status)
									}
								/>
							</Box>
						</Box>
					</Box>
				))}
				{!isLoading && operators.length === 0 ? (
					<Box className="empty">No operators yet.</Box>
				) : null}
			</Box>
		</Box>
	);
}

// ── Group members ────────────────────────────────────────────────────────────
function GroupMembersPanel({ groupId }: { groupId: string }) {
	const { members, isLoading, mutate } = useAdminGroupMembers(groupId);
	const toast = useToast();
	const [principalId, setPrincipalId] = useState("");
	const [busy, setBusy] = useState(false);

	const addMember = async () => {
		if (!principalId.trim()) return;
		setBusy(true);
		try {
			await api().post(`/api/admin/iam/groups/${groupId}/members`, {
				principalType: "operator",
				principalId: principalId.trim(),
			});
			toast.push("Member added", { type: "success" });
			setPrincipalId("");
			await mutate();
		} catch (e) {
			toast.push(errMessage(e, "Could not add member"), { type: "warn" });
		} finally {
			setBusy(false);
		}
	};

	const removeMember = async (id: string) => {
		try {
			await api().delete(
				`/api/admin/iam/groups/${groupId}/members/${id}?type=operator`,
			);
			toast.push("Member removed", { type: "success" });
			await mutate();
		} catch (e) {
			toast.push(errMessage(e, "Could not remove member"), {
				type: "warn",
			});
		}
	};

	return (
		<Box className="sub-block">
			<Text className="sub-title">Members</Text>
			{members.map((m) => (
				<Box key={m.principalId} className="member-row">
					<Box>
						<Text style={{ fontSize: 13, fontWeight: 500 }}>
							{m.name || m.principalId}
						</Text>
						<Text
							style={{
								fontSize: 12,
								color: "var(--Text-Secondary)",
							}}
						>
							{m.email || m.principalType}
						</Text>
					</Box>
					<button
						type="button"
						className="link-btn"
						onClick={() => removeMember(m.principalId)}
					>
						Remove
					</button>
				</Box>
			))}
			{!isLoading && members.length === 0 ? (
				<Text style={{ fontSize: 13, color: "var(--Text-Secondary)" }}>
					No members yet.
				</Text>
			) : null}
			<Box className="inline-form">
				<input
					placeholder="Operator user id to add"
					value={principalId}
					onChange={(e) => setPrincipalId(e.target.value)}
				/>
				<Button
					title="Add"
					variant="soft"
					size="sm"
					disabled={busy}
					handleClick={addMember}
				/>
			</Box>
		</Box>
	);
}

// ── Groups ───────────────────────────────────────────────────────────────────
function GroupCard({
	group,
	policies,
	mutateKey,
}: {
	group: IAdminGroup;
	policies: IAdminPolicy[];
	mutateKey: string;
}) {
	const toast = useToast();
	const [expanded, setExpanded] = useState(false);
	const isCustomer = group.managedBy === "customer";

	const policyOptions = useMemo(
		() => policies.map((p) => ({ label: p.name, value: p._id })),
		[policies],
	);

	const setPolicies = async (ids: string[]) => {
		try {
			await api().patch(`/api/admin/iam/groups/${group._id}`, {
				attachedPolicyIds: ids,
			});
			toast.push("Group policies updated", { type: "success" });
			await globalMutate(mutateKey);
		} catch (e) {
			toast.push(errMessage(e, "Could not update policies"), {
				type: "warn",
			});
		}
	};

	const deleteGroup = async () => {
		try {
			await api().delete(`/api/admin/iam/groups/${group._id}`);
			toast.push("Group deleted", { type: "success" });
			await globalMutate(mutateKey);
		} catch (e) {
			toast.push(errMessage(e, "Could not delete group"), {
				type: "warn",
			});
		}
	};

	return (
		<Box className="iam-card">
			<Box className="card-top">
				<Box>
					<Text className="card-name">{group.name}</Text>
					<Text className="card-meta">
						{group.attachedPolicyIds.length} attached{" "}
						{group.attachedPolicyIds.length === 1
							? "policy"
							: "policies"}
					</Text>
				</Box>
				<Box className="card-actions">
					<ManagedBadge managedBy={group.managedBy} />
					{isCustomer ? (
						<Button
							title="Delete"
							variant="danger-soft"
							size="sm"
							leadingIcon={<FiTrash2 size={14} />}
							handleClick={deleteGroup}
						/>
					) : null}
				</Box>
			</Box>

			<Box className="sub-block">
				<Text className="sub-title">Attached policies</Text>
				<Select
					options={policyOptions}
					isMulti
					value={group.attachedPolicyIds}
					onChange={() => {}}
					onChangeMulti={setPolicies}
					isDisabled={!isCustomer}
					placeholder="Attach policies…"
				/>
			</Box>

			<button
				type="button"
				className="link-btn"
				style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
				onClick={() => setExpanded((v) => !v)}
			>
				{expanded ? (
					<FiChevronDown size={14} />
				) : (
					<FiChevronRight size={14} />
				)}
				{expanded ? "Hide members" : "Manage members"}
			</button>
			{expanded ? <GroupMembersPanel groupId={group._id} /> : null}
		</Box>
	);
}

function GroupsSection() {
	const { groups, isLoading, mutateKey } = useAdminGroups();
	const { policies } = useAdminPolicies();
	const toast = useToast();
	const [name, setName] = useState("");
	const [busy, setBusy] = useState(false);

	const createGroup = async () => {
		if (!name.trim()) return;
		setBusy(true);
		try {
			await api().post("/api/admin/iam/groups", { name: name.trim() });
			toast.push("Group created", { type: "success" });
			setName("");
			await globalMutate(mutateKey);
		} catch (e) {
			toast.push(errMessage(e, "Could not create group"), {
				type: "warn",
			});
		} finally {
			setBusy(false);
		}
	};

	return (
		<Box className="section">
			<Box className="create-row">
				<input
					placeholder="New group name"
					value={name}
					onChange={(e) => setName(e.target.value)}
				/>
				<Button
					title="Create group"
					variant="primary"
					disabled={busy}
					handleClick={createGroup}
				/>
			</Box>

			<Box className="cards">
				{groups.map((g) => (
					<GroupCard
						key={g._id}
						group={g}
						policies={policies}
						mutateKey={mutateKey}
					/>
				))}
				{!isLoading && groups.length === 0 ? (
					<Box className="empty">No groups yet.</Box>
				) : null}
			</Box>
		</Box>
	);
}

// ── Policies ─────────────────────────────────────────────────────────────────
const NEW_POLICY_TEMPLATE = `{
  "version": "2025-01-01",
  "statements": [
    {
      "effect": "Allow",
      "action": ["organizations:List"],
      "resource": ["arn:mr:platform:::organizations"]
    }
  ]
}`;

function PolicyCard({
	policy,
	mutateKey,
}: {
	policy: IAdminPolicy;
	mutateKey: string;
}) {
	const toast = useToast();
	const isCustomer = policy.managedBy === "customer";
	const [editing, setEditing] = useState(false);
	const [draft, setDraft] = useState("");
	const [busy, setBusy] = useState(false);

	const startEdit = () => {
		setDraft(JSON.stringify(policy.document, null, 2));
		setEditing(true);
	};

	const saveEdit = async () => {
		let document: unknown;
		try {
			document = JSON.parse(draft);
		} catch {
			toast.push("Document is not valid JSON", { type: "warn" });
			return;
		}
		setBusy(true);
		try {
			await api().patch(`/api/admin/iam/policies/${policy._id}`, {
				document,
			});
			toast.push("Policy updated", { type: "success" });
			setEditing(false);
			await globalMutate(mutateKey);
		} catch (e) {
			toast.push(errMessage(e, "Could not update policy"), {
				type: "warn",
			});
		} finally {
			setBusy(false);
		}
	};

	const deletePolicy = async () => {
		try {
			await api().delete(`/api/admin/iam/policies/${policy._id}`);
			toast.push("Policy deleted", { type: "success" });
			await globalMutate(mutateKey);
		} catch (e) {
			toast.push(errMessage(e, "Could not delete policy"), {
				type: "warn",
			});
		}
	};

	return (
		<Box className="iam-card">
			<Box className="card-top">
				<Box>
					<Text className="card-name">{policy.name}</Text>
					<Text className="card-meta">
						{policy.document.statements.length}{" "}
						{policy.document.statements.length === 1
							? "statement"
							: "statements"}{" "}
						· v{policy.document.version}
					</Text>
				</Box>
				<Box className="card-actions">
					<ManagedBadge managedBy={policy.managedBy} />
					{isCustomer ? (
						<>
							<Button
								title={editing ? "Cancel" : "Edit"}
								variant="soft"
								size="sm"
								handleClick={() =>
									editing ? setEditing(false) : startEdit()
								}
							/>
							<Button
								title="Delete"
								variant="danger-soft"
								size="sm"
								leadingIcon={<FiTrash2 size={14} />}
								handleClick={deletePolicy}
							/>
						</>
					) : null}
				</Box>
			</Box>

			{editing ? (
				<Box className="create-row column">
					<textarea
						value={draft}
						onChange={(e) => setDraft(e.target.value)}
					/>
					<Button
						title="Save policy"
						variant="primary"
						disabled={busy}
						handleClick={saveEdit}
					/>
				</Box>
			) : (
				<pre className="policy-doc">
					{JSON.stringify(policy.document, null, 2)}
				</pre>
			)}
		</Box>
	);
}

function PoliciesSection() {
	const { policies, isLoading, mutateKey } = useAdminPolicies();
	const toast = useToast();
	const [name, setName] = useState("");
	const [doc, setDoc] = useState(NEW_POLICY_TEMPLATE);
	const [busy, setBusy] = useState(false);

	const createPolicy = async () => {
		if (!name.trim()) {
			toast.push("Give the policy a name", { type: "warn" });
			return;
		}
		let document: unknown;
		try {
			document = JSON.parse(doc);
		} catch {
			toast.push("Document is not valid JSON", { type: "warn" });
			return;
		}
		setBusy(true);
		try {
			await api().post("/api/admin/iam/policies", {
				name: name.trim(),
				document,
			});
			toast.push("Policy created", { type: "success" });
			setName("");
			setDoc(NEW_POLICY_TEMPLATE);
			await globalMutate(mutateKey);
		} catch (e) {
			toast.push(errMessage(e, "Could not create policy"), {
				type: "warn",
			});
		} finally {
			setBusy(false);
		}
	};

	return (
		<Box className="section">
			<Box className="create-row column">
				<input
					placeholder="New policy name"
					value={name}
					onChange={(e) => setName(e.target.value)}
				/>
				<textarea
					value={doc}
					onChange={(e) => setDoc(e.target.value)}
				/>
				<Button
					title="Create policy"
					variant="primary"
					disabled={busy}
					handleClick={createPolicy}
				/>
			</Box>

			<Box className="cards">
				{policies.map((p) => (
					<PolicyCard key={p._id} policy={p} mutateKey={mutateKey} />
				))}
				{!isLoading && policies.length === 0 ? (
					<Box className="empty">No policies yet.</Box>
				) : null}
			</Box>
		</Box>
	);
}

// ── Shell ────────────────────────────────────────────────────────────────────
type Tab = "operators" | "groups" | "policies";

function IamContent() {
	const [tab, setTab] = useState<Tab>("operators");

	return (
		<IamStyled>
			<Box>
				<Text
					style={{
						fontSize: 24,
						fontWeight: 700,
						color: "var(--Black)",
					}}
				>
					IAM
				</Text>
				<Text style={{ fontSize: 14, color: "var(--Text-Secondary)" }}>
					Operators, groups and policies for the platform plane.
				</Text>
			</Box>

			<Box className="tab-bar">
				<Box
					className={`tab ${tab === "operators" ? "active" : ""}`}
					onClick={() => setTab("operators")}
				>
					Operators
				</Box>
				<Box
					className={`tab ${tab === "groups" ? "active" : ""}`}
					onClick={() => setTab("groups")}
				>
					Groups
				</Box>
				<Box
					className={`tab ${tab === "policies" ? "active" : ""}`}
					onClick={() => setTab("policies")}
				>
					Policies
				</Box>
			</Box>

			{tab === "operators" ? <OperatorsSection /> : null}
			{tab === "groups" ? <GroupsSection /> : null}
			{tab === "policies" ? <PoliciesSection /> : null}
		</IamStyled>
	);
}

function IamWrapper() {
	return (
		<AdminShell>
			<IamContent />
		</AdminShell>
	);
}

export default memo(IamWrapper);
