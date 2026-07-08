import "server-only";
import { getUsersByIdsDB } from "../models";
import { principalArnForOperator, principalArnForUser } from "./arn";
import {
	addMembershipDB,
	createIamGroupDB,
	createIamOperatorDB,
	createIamPolicyDB,
	deleteIamGroupDB,
	deleteIamPolicyDB,
	getIamGroupsByIdsDB,
	getIamOperatorByUserIdDB,
	getIamPoliciesByIdsDB,
	getMembershipsForGroupDB,
	type IIamGroup,
	type IIamPolicy,
	isValidPolicyDocument,
	listIamGroupsDB,
	listIamOperatorsDB,
	listIamPoliciesDB,
	listMembershipsForOrgDB,
	removeMembershipDB,
	setGroupAttachedPoliciesDB,
	setIamOperatorStatusDB,
	updateIamPolicyDocumentDB,
} from "./models";
import { bumpPolicyVersion, invalidatePrincipal } from "./resolve";
import { seedPlatformSystemPolicies } from "./seed/system-policies";
import type { Plane, PolicyDocument } from "./types";

// ── IAM administration service ──────────────────────────────────────────────
// The security core shared by the platform-operator console (plane "platform",
// orgId null) and the org-admin console (plane "org", orgId = the caller's org).
// The ROUTE decides the (plane, orgId) scope and gates access with authorize();
// this module then enforces the two invariants that authorize() cannot:
//   1. System-managed policies/groups are immutable (only `customer` ones edit).
//   2. Every read/write stays inside its (plane, orgId) scope — no cross-tenant
//      leakage even for a legitimately-authorized caller.
// Policy/group edits bump the global policy version; membership edits invalidate
// the affected principal, so the engine never decides on stale grants.

export interface AdminScope {
	plane: Plane;
	orgId: string | null;
}

function scopeMatches(
	doc: { plane: string; orgId?: unknown },
	scope: AdminScope,
): boolean {
	if (doc.plane !== scope.plane) return false;
	const docOrg = doc.orgId ? String(doc.orgId) : null;
	return docOrg === scope.orgId;
}

// ── Policies ────────────────────────────────────────────────────────────────

export async function adminListPolicies(
	scope: AdminScope,
): Promise<IIamPolicy[]> {
	return listIamPoliciesDB({ plane: scope.plane, orgId: scope.orgId });
}

export async function adminCreatePolicy({
	scope,
	name,
	document,
}: {
	scope: AdminScope;
	name: string;
	document: PolicyDocument;
}): Promise<IIamPolicy | null> {
	if (!isValidPolicyDocument(document)) return null;
	const created = await createIamPolicyDB({
		payload: {
			name,
			plane: scope.plane,
			orgId: scope.orgId,
			managedBy: "customer",
			document,
		},
	});
	if (created) await bumpPolicyVersion();
	return created;
}

export async function adminUpdatePolicy({
	scope,
	policyId,
	document,
}: {
	scope: AdminScope;
	policyId: string;
	document: PolicyDocument;
}): Promise<IIamPolicy | null> {
	if (!isValidPolicyDocument(document)) return null;
	// Confirm the target is in-scope AND customer-managed before mutating.
	const [existing] = await getIamPoliciesByIdsDB({ ids: [policyId] });
	if (
		!existing ||
		existing.managedBy !== "customer" ||
		!scopeMatches(existing, scope)
	) {
		return null;
	}
	const updated = await updateIamPolicyDocumentDB({ id: policyId, document });
	if (updated) await bumpPolicyVersion();
	return updated;
}

export async function adminDeletePolicy({
	scope,
	policyId,
}: {
	scope: AdminScope;
	policyId: string;
}): Promise<boolean> {
	const deleted = await deleteIamPolicyDB({
		id: policyId,
		orgId: scope.orgId,
	});
	if (deleted) await bumpPolicyVersion();
	return deleted;
}

// ── Groups ──────────────────────────────────────────────────────────────────

async function policyIdsInScope(
	scope: AdminScope,
	policyIds: string[],
): Promise<boolean> {
	if (policyIds.length === 0) return true;
	const policies = await getIamPoliciesByIdsDB({ ids: policyIds });
	if (policies.length !== new Set(policyIds).size) return false;
	return policies.every((p) => scopeMatches(p, scope));
}

export async function adminListGroups(scope: AdminScope): Promise<IIamGroup[]> {
	return listIamGroupsDB({ plane: scope.plane, orgId: scope.orgId });
}

export async function adminCreateGroup({
	scope,
	name,
	attachedPolicyIds = [],
}: {
	scope: AdminScope;
	name: string;
	attachedPolicyIds?: string[];
}): Promise<IIamGroup | null> {
	// A group may only ever attach policies from its own tenant scope.
	if (!(await policyIdsInScope(scope, attachedPolicyIds))) return null;
	const created = await createIamGroupDB({
		payload: {
			name,
			plane: scope.plane,
			orgId: scope.orgId,
			managedBy: "customer",
			attachedPolicyIds,
		},
	});
	if (created) await bumpPolicyVersion();
	return created;
}

export async function adminSetGroupPolicies({
	scope,
	groupId,
	attachedPolicyIds,
}: {
	scope: AdminScope;
	groupId: string;
	attachedPolicyIds: string[];
}): Promise<IIamGroup | null> {
	const [group] = await getIamGroupsByIdsDB({ ids: [groupId] });
	// System groups (e.g. OrgAdmin) are immutable — editing their policies would
	// silently rewrite the role semantics the whole cutover depends on.
	if (
		!group ||
		group.managedBy !== "customer" ||
		!scopeMatches(group, scope)
	) {
		return null;
	}
	if (!(await policyIdsInScope(scope, attachedPolicyIds))) return null;
	const updated = await setGroupAttachedPoliciesDB({
		groupId,
		attachedPolicyIds,
	});
	if (updated) await bumpPolicyVersion();
	return updated;
}

export async function adminDeleteGroup({
	scope,
	groupId,
}: {
	scope: AdminScope;
	groupId: string;
}): Promise<boolean> {
	// Purge the group's memberships first so no principal keeps a dangling grant.
	const members = await getMembershipsForGroupDB({ groupId });
	const deleted = await deleteIamGroupDB({ id: groupId, orgId: scope.orgId });
	if (!deleted) return false;
	for (const m of members) {
		await removeMembershipDB({
			groupId,
			principalType: m.principalType,
			principalId: m.principalId.toString(),
			orgId: m.orgId ? m.orgId.toString() : null,
		});
		await invalidatePrincipal(principalArnFor(m));
	}
	await bumpPolicyVersion();
	return true;
}

// ── Memberships ─────────────────────────────────────────────────────────────

function principalArnFor(m: {
	principalType: "user" | "operator";
	principalId: { toString(): string };
	orgId?: { toString(): string } | null;
}): string {
	if (m.principalType === "operator") {
		return principalArnForOperator(m.principalId.toString());
	}
	return principalArnForUser(
		m.orgId ? m.orgId.toString() : "*",
		m.principalId.toString(),
	);
}

export interface EnrichedMember {
	principalType: "user" | "operator";
	principalId: string;
	name: string;
	email: string;
}

export async function adminListGroupMembers({
	groupId,
}: {
	groupId: string;
}): Promise<EnrichedMember[]> {
	const members = await getMembershipsForGroupDB({ groupId });
	const ids = Array.from(
		new Set(members.map((m) => m.principalId.toString())),
	);
	const users = ids.length
		? await getUsersByIdsDB({ ids, limit: ids.length, offset: 0 })
		: [];
	const userMap = new Map(users.map((u) => [u._id.toString(), u]));
	return members.map((m) => {
		const u = userMap.get(m.principalId.toString());
		return {
			principalType: m.principalType,
			principalId: m.principalId.toString(),
			name: u?.name ?? "",
			email: u?.email ?? "",
		};
	});
}

export interface OrgMembershipRow {
	principalId: string;
	name: string;
	email: string;
	groupIds: string[];
}

/**
 * The member→group matrix for an org, for the org-admin console. Aggregates all
 * of the org's memberships by principal and enriches with the user's name/email.
 */
export async function adminListOrgMemberships({
	orgId,
}: {
	orgId: string;
}): Promise<OrgMembershipRow[]> {
	const memberships = await listMembershipsForOrgDB({ orgId });
	const byPrincipal = new Map<string, string[]>();
	for (const m of memberships) {
		const pid = m.principalId.toString();
		const list = byPrincipal.get(pid) ?? [];
		list.push(m.groupId.toString());
		byPrincipal.set(pid, list);
	}
	const ids = Array.from(byPrincipal.keys());
	const users = ids.length
		? await getUsersByIdsDB({ ids, limit: ids.length, offset: 0 })
		: [];
	const userMap = new Map(users.map((u) => [u._id.toString(), u]));
	return ids.map((pid) => {
		const u = userMap.get(pid);
		return {
			principalId: pid,
			name: u?.name ?? "",
			email: u?.email ?? "",
			groupIds: byPrincipal.get(pid) ?? [],
		};
	});
}

export async function adminAddMember({
	scope,
	groupId,
	principalType,
	principalId,
}: {
	scope: AdminScope;
	groupId: string;
	principalType: "user" | "operator";
	principalId: string;
}): Promise<boolean> {
	// The group must exist inside the caller's scope (prevents adding members to
	// another tenant's group). System groups ARE valid targets here — that is how
	// roles are assigned (join OrgViewer/OrgAdmin, join platform-admins).
	const [group] = await getIamGroupsByIdsDB({ ids: [groupId] });
	if (!group || !scopeMatches(group, scope)) return false;
	const membership = await addMembershipDB({
		payload: {
			groupId,
			principalType,
			principalId,
			orgId: scope.orgId,
		},
	});
	if (!membership) return false;
	await invalidatePrincipal(
		principalArnFor({ principalType, principalId, orgId: scope.orgId }),
	);
	return true;
}

export async function adminRemoveMember({
	scope,
	groupId,
	principalType,
	principalId,
}: {
	scope: AdminScope;
	groupId: string;
	principalType: "user" | "operator";
	principalId: string;
}): Promise<boolean> {
	const [group] = await getIamGroupsByIdsDB({ ids: [groupId] });
	if (!group || !scopeMatches(group, scope)) return false;
	const removed = await removeMembershipDB({
		groupId,
		principalType,
		principalId,
		orgId: scope.orgId,
	});
	await invalidatePrincipal(
		principalArnFor({ principalType, principalId, orgId: scope.orgId }),
	);
	return removed;
}

// ── Operators (platform plane only) ─────────────────────────────────────────

export interface EnrichedOperator {
	userId: string;
	status: "active" | "disabled";
	name: string;
	email: string;
	createdAt: Date | null;
}

export async function adminListOperators(): Promise<EnrichedOperator[]> {
	const operators = await listIamOperatorsDB();
	const ids = operators.map((o) => o.userId.toString());
	const users = ids.length
		? await getUsersByIdsDB({ ids, limit: ids.length, offset: 0 })
		: [];
	const userMap = new Map(users.map((u) => [u._id.toString(), u]));
	return operators.map((o) => {
		const u = userMap.get(o.userId.toString());
		return {
			userId: o.userId.toString(),
			status: o.status,
			name: u?.name ?? "",
			email: u?.email ?? "",
			createdAt: (o as unknown as { createdAt?: Date }).createdAt ?? null,
		};
	});
}

/**
 * Promote an existing tenant user to a platform operator. Verifies the user
 * exists, ensures the platform system policies/groups are seeded, and creates
 * the (unique) operator identity. Does NOT grant any group — the caller assigns
 * the operator to a platform group afterwards.
 */
export async function adminCreateOperator({
	userId,
}: {
	userId: string;
}): Promise<{ ok: boolean; reason?: string }> {
	const users = await getUsersByIdsDB({ ids: [userId], limit: 1, offset: 0 });
	if (users.length === 0) return { ok: false, reason: "unknown-user" };
	const existing = await getIamOperatorByUserIdDB({ userId });
	if (existing) return { ok: false, reason: "already-operator" };
	await seedPlatformSystemPolicies();
	const created = await createIamOperatorDB({ payload: { userId } });
	if (!created) return { ok: false, reason: "create-failed" };
	return { ok: true };
}

export async function adminSetOperatorStatus({
	userId,
	status,
}: {
	userId: string;
	status: "active" | "disabled";
}): Promise<boolean> {
	const updated = await setIamOperatorStatusDB({ userId, status });
	if (!updated) return false;
	await invalidatePrincipal(principalArnForOperator(userId));
	return true;
}
