import "server-only";
import { MAX_LIMIT } from "../../constants";
import { adminAddMember, adminRemoveMember } from "../../iam/admin";
import {
	getIamGroupsByIdsDB,
	listGroupsByPlaneDB,
	listMembershipsForPrincipalAllOrgsDB,
} from "../../iam/models";
import {
	getOrganizationsByIdsDB,
	getUserByIdDB,
	setUserStatusDB,
	User,
} from "../../models";
import type { UserStatus } from "../../models/users/types";

// Operator-facing user directory + membership management. The route decides
// authorization (platform plane); this module resolves the friendly, enriched
// shapes the console renders and funnels membership writes through the IAM
// admin service so every invariant (scope confinement, principal cache
// invalidation) still holds.

export interface PlatformUserRow {
	id: string;
	name: string;
	email: string;
	username: string;
	status: UserStatus;
	currentOrganizationId: string | null;
	createdAt: Date;
}

export interface UserMembershipRow {
	groupId: string;
	groupName: string;
	orgId: string | null;
	orgName: string;
}

export interface PlatformUserDetail extends PlatformUserRow {
	memberships: UserMembershipRow[];
}

export interface OrgGroupOption {
	groupId: string;
	name: string;
	orgId: string | null;
	orgName: string;
	managedBy: "system" | "customer";
}

function escapeRegex(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

type UserLean = {
	_id: { toString(): string };
	name?: string;
	email?: string;
	username?: string;
	status?: UserStatus;
	currentOrganizationId?: string | null;
	createdAt: Date;
};

export async function listPlatformUsers({
	search = "",
	offset = 0,
	limit = 20,
}: {
	search?: string;
	offset?: number;
	limit?: number;
}): Promise<{ users: PlatformUserRow[]; total: number }> {
	const safeLimit = Math.min(Math.max(limit, 1), MAX_LIMIT);
	const filter: Record<string, unknown> = { deleted: false };
	const term = search.trim();
	if (term) {
		const rx = { $regex: escapeRegex(term), $options: "i" };
		filter.$or = [{ name: rx }, { email: rx }, { username: rx }];
	}

	let docs: UserLean[] = [];
	let total = 0;
	try {
		[docs, total] = await Promise.all([
			User.find(filter)
				.select(
					"name email username status currentOrganizationId createdAt",
				)
				.sort({ createdAt: -1 })
				.skip(Math.max(offset, 0))
				.limit(safeLimit)
				.lean<UserLean[]>(),
			User.countDocuments(filter),
		]);
	} catch {
		return { users: [], total: 0 };
	}

	const users = docs.map((d) => ({
		id: d._id.toString(),
		name: d.name ?? "",
		email: d.email ?? "",
		username: d.username ?? "",
		status: d.status ?? "active",
		currentOrganizationId: d.currentOrganizationId ?? null,
		createdAt: d.createdAt,
	}));
	return { users, total };
}

async function resolveMemberships(
	userId: string,
): Promise<UserMembershipRow[]> {
	const memberships = await listMembershipsForPrincipalAllOrgsDB({
		principalType: "user",
		principalId: userId,
	});
	if (memberships.length === 0) return [];

	const groupIds = Array.from(
		new Set(memberships.map((m) => m.groupId.toString())),
	);
	const orgIds = Array.from(
		new Set(
			memberships
				.map((m) => (m.orgId ? m.orgId.toString() : null))
				.filter((v): v is string => Boolean(v)),
		),
	);
	const [groups, orgs] = await Promise.all([
		getIamGroupsByIdsDB({ ids: groupIds }),
		orgIds.length
			? getOrganizationsByIdsDB({
					ids: orgIds,
					limit: orgIds.length,
					offset: 0,
				})
			: Promise.resolve([]),
	]);
	const groupMap = new Map(groups.map((g) => [g._id.toString(), g]));
	const orgMap = new Map(orgs.map((o) => [o.id.toString(), o]));

	return memberships.map((m) => {
		const orgId = m.orgId ? m.orgId.toString() : null;
		return {
			groupId: m.groupId.toString(),
			groupName: groupMap.get(m.groupId.toString())?.name ?? "(unknown)",
			orgId,
			orgName: orgId ? (orgMap.get(orgId)?.name ?? "(unknown)") : "—",
		};
	});
}

export async function getPlatformUserDetail({
	userId,
}: {
	userId: string;
}): Promise<PlatformUserDetail | null> {
	const user = await getUserByIdDB({ id: userId });
	if (!user) return null;
	const memberships = await resolveMemberships(userId);
	return {
		id: user._id.toString(),
		name: user.name ?? "",
		email: user.email ?? "",
		username: user.username ?? "",
		status: (user as { status?: UserStatus }).status ?? "active",
		currentOrganizationId: user.currentOrganizationId ?? null,
		createdAt: user.createdAt,
		memberships,
	};
}

export async function setPlatformUserStatus({
	userId,
	status,
}: {
	userId: string;
	status: UserStatus;
}): Promise<PlatformUserRow | null> {
	const existing = await getUserByIdDB({ id: userId });
	if (!existing) return null;
	const updated = await setUserStatusDB({ id: userId, status });
	if (!updated) return null;
	return {
		id: updated._id.toString(),
		name: updated.name ?? "",
		email: updated.email ?? "",
		username: updated.username ?? "",
		status: (updated as { status?: UserStatus }).status ?? status,
		currentOrganizationId: updated.currentOrganizationId ?? null,
		createdAt: updated.createdAt,
	};
}

export async function listOrgGroupsForMembership(): Promise<OrgGroupOption[]> {
	const groups = await listGroupsByPlaneDB({ plane: "org" });
	const orgIds = Array.from(
		new Set(
			groups
				.map((g) => (g.orgId ? g.orgId.toString() : null))
				.filter((v): v is string => Boolean(v)),
		),
	);
	const orgs = orgIds.length
		? await getOrganizationsByIdsDB({
				ids: orgIds,
				limit: orgIds.length,
				offset: 0,
			})
		: [];
	const orgMap = new Map(orgs.map((o) => [o.id.toString(), o]));
	return groups.map((g) => {
		const orgId = g.orgId ? g.orgId.toString() : null;
		return {
			groupId: g._id.toString(),
			name: g.name,
			orgId,
			orgName: orgId ? (orgMap.get(orgId)?.name ?? "(unknown)") : "—",
			managedBy: g.managedBy,
		};
	});
}

/** Result reasons let the route map to precise HTTP codes. */
export type MembershipMutationResult =
	| { ok: true }
	| { ok: false; reason: "unknown-user" | "unknown-group" | "failed" };

export async function addUserGroupMembership({
	userId,
	groupId,
}: {
	userId: string;
	groupId: string;
}): Promise<MembershipMutationResult> {
	const user = await getUserByIdDB({ id: userId });
	if (!user) return { ok: false, reason: "unknown-user" };
	const [group] = await getIamGroupsByIdsDB({ ids: [groupId] });
	if (!group || group.plane !== "org" || !group.orgId) {
		return { ok: false, reason: "unknown-group" };
	}
	const ok = await adminAddMember({
		scope: { plane: "org", orgId: group.orgId.toString() },
		groupId,
		principalType: "user",
		principalId: userId,
	});
	return ok ? { ok: true } : { ok: false, reason: "failed" };
}

export async function removeUserGroupMembership({
	userId,
	groupId,
}: {
	userId: string;
	groupId: string;
}): Promise<MembershipMutationResult> {
	const [group] = await getIamGroupsByIdsDB({ ids: [groupId] });
	if (!group || group.plane !== "org" || !group.orgId) {
		return { ok: false, reason: "unknown-group" };
	}
	const ok = await adminRemoveMember({
		scope: { plane: "org", orgId: group.orgId.toString() },
		groupId,
		principalType: "user",
		principalId: userId,
	});
	return ok ? { ok: true } : { ok: false, reason: "failed" };
}
