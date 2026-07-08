import type { ClientSession } from "mongoose";
import type { IIamGroup, IIamPolicy } from "../models";
import {
	addMembershipDB,
	createIamGroupDB,
	createIamPolicyDB,
	findIamGroupByNameDB,
	findIamPolicyByNameDB,
	setGroupAttachedPoliciesDB,
	setSystemPolicyDocumentDB,
} from "../models";
import type { PolicyDocument } from "../types";

const POLICY_VERSION = "2026-01-01";

/** Order-insensitive structural serialization for drift comparison. */
function stableStringify(value: unknown): string {
	return JSON.stringify(value, (_key, val) =>
		val && typeof val === "object" && !Array.isArray(val)
			? Object.fromEntries(
					Object.keys(val as Record<string, unknown>)
						.sort()
						.map((k) => [k, (val as Record<string, unknown>)[k]]),
				)
			: val,
	);
}

// ── Org-plane system policy documents ───────────────────────────────────────
// These reproduce the old admin/manager/viewer semantics EXACTLY so no one's
// effective access changes on cutover. `{orgId}` is baked into each document so
// a policy can only ever grant access within its own tenant.

/** admin → `*` on everything in the org. */
export function orgAdminDocument(orgId: string): PolicyDocument {
	return {
		version: POLICY_VERSION,
		statements: [
			{
				sid: "OrgAdminFull",
				effect: "Allow",
				action: ["*"],
				resource: [`mr:org:*:${orgId}:*/*`],
			},
		],
	};
}

/**
 * manager → all CRUD on domain resources, minus org administration. The deny
 * list mirrors exactly what the pre-cutover `assertOrganizationAdmin` reserved
 * for admins: iam:*, member management (invite/role-change/remove), org-profile
 * edits, and deletion. Without `organizations:Update`/`InviteMember` here a
 * manager could edit org settings or invite/self-promote to admin.
 */
export function orgManagerDocument(orgId: string): PolicyDocument {
	return {
		version: POLICY_VERSION,
		statements: [
			{
				sid: "OrgManagerAllow",
				effect: "Allow",
				action: ["*"],
				resource: [`mr:org:*:${orgId}:*/*`],
			},
			{
				sid: "OrgManagerDenyPrivileged",
				effect: "Deny",
				action: [
					"iam:*",
					"organizations:Update",
					"organizations:InviteMember",
					"organizations:RemoveMember",
					"organizations:Delete",
				],
				resource: [`mr:org:*:${orgId}:*/*`],
			},
		],
	};
}

/** viewer → read-only (`*:Read`, `*:List`). */
export function orgViewerDocument(orgId: string): PolicyDocument {
	return {
		version: POLICY_VERSION,
		statements: [
			{
				sid: "OrgViewerReadOnly",
				effect: "Allow",
				action: ["*:Read", "*:List"],
				resource: [`mr:org:*:${orgId}:*/*`],
			},
		],
	};
}

// ── Platform-plane system policy documents ──────────────────────────────────

export const PLATFORM_POLICY_DOCUMENTS: Record<string, PolicyDocument> = {
	PlatformAdmin: {
		version: POLICY_VERSION,
		statements: [
			{
				sid: "PlatformAdminFull",
				effect: "Allow",
				action: ["*"],
				resource: ["mr:platform:*:*:*/*"],
			},
		],
	},
	PlatformSupport: {
		version: POLICY_VERSION,
		statements: [
			{
				sid: "PlatformSupportReadOnly",
				effect: "Allow",
				action: ["*:Read", "*:List"],
				resource: ["mr:platform:*:*:*/*"],
			},
		],
	},
	PlatformBilling: {
		version: POLICY_VERSION,
		statements: [
			{
				sid: "PlatformBilling",
				effect: "Allow",
				action: [
					"billing:*",
					"organizations:Read",
					"organizations:List",
				],
				resource: ["mr:platform:*:*:*/*"],
			},
		],
	},
	PlatformIam: {
		version: POLICY_VERSION,
		statements: [
			{
				sid: "PlatformIam",
				effect: "Allow",
				action: ["iam:*", "organizations:Read", "organizations:List"],
				resource: ["mr:platform:*:*:*/*"],
			},
		],
	},
};

const PLATFORM_GROUP_POLICIES: Record<string, string[]> = {
	"platform-admins": ["PlatformAdmin"],
	"platform-support": ["PlatformSupport"],
	"platform-billing": ["PlatformBilling"],
	"platform-iam": ["PlatformIam"],
};

// ── Idempotent seeding primitives ───────────────────────────────────────────

async function ensurePolicy(
	{
		name,
		plane,
		orgId,
		document,
	}: {
		name: string;
		plane: "platform" | "org";
		orgId: string | null;
		document: PolicyDocument;
	},
	session?: ClientSession,
): Promise<IIamPolicy | null> {
	const existing = await findIamPolicyByNameDB({
		plane,
		orgId,
		name,
		session,
	});
	if (existing) {
		// Repair drift so a changed canonical definition (e.g. a tightened deny
		// list) propagates to already-seeded orgs when the migration re-runs.
		if (stableStringify(existing.document) !== stableStringify(document)) {
			const repaired = await setSystemPolicyDocumentDB({
				id: existing._id.toString(),
				document,
				session,
			});
			return repaired ?? existing;
		}
		return existing;
	}
	return createIamPolicyDB({
		payload: { name, plane, orgId, managedBy: "system", document },
		session,
	});
}

async function ensureGroup(
	{
		name,
		plane,
		orgId,
		policyIds,
	}: {
		name: string;
		plane: "platform" | "org";
		orgId: string | null;
		policyIds: string[];
	},
	session?: ClientSession,
): Promise<IIamGroup | null> {
	const existing = await findIamGroupByNameDB({
		plane,
		orgId,
		name,
		session,
	});
	if (existing) {
		// Reconcile attached policies so re-running seed repairs drift.
		const current = existing.attachedPolicyIds.map((id) => id.toString());
		const wanted = new Set(policyIds);
		const same =
			current.length === wanted.size &&
			current.every((id) => wanted.has(id));
		if (same) return existing;
		return setGroupAttachedPoliciesDB({
			groupId: existing._id.toString(),
			attachedPolicyIds: policyIds,
			session,
		});
	}
	return createIamGroupDB({
		payload: {
			name,
			plane,
			orgId,
			managedBy: "system",
			attachedPolicyIds: policyIds,
		},
		session,
	});
}

export interface OrgSystemGroups {
	admin: IIamGroup;
	manager: IIamGroup;
	viewer: IIamGroup;
}

/**
 * Seed (or repair) the three system groups + policies for a single org. Called
 * at org-creation time and by the role migration. Idempotent.
 */
export async function seedOrgSystemGroups(
	orgId: string,
	session?: ClientSession,
): Promise<OrgSystemGroups | null> {
	const specs: Array<{ name: string; document: PolicyDocument }> = [
		{ name: "OrgAdmin", document: orgAdminDocument(orgId) },
		{ name: "OrgManager", document: orgManagerDocument(orgId) },
		{ name: "OrgViewer", document: orgViewerDocument(orgId) },
	];

	const groups: Record<string, IIamGroup> = {};
	for (const spec of specs) {
		const policy = await ensurePolicy(
			{ name: spec.name, plane: "org", orgId, document: spec.document },
			session,
		);
		if (!policy) return null;
		const group = await ensureGroup(
			{
				name: spec.name,
				plane: "org",
				orgId,
				policyIds: [policy._id.toString()],
			},
			session,
		);
		if (!group) return null;
		groups[spec.name] = group;
	}

	const admin = groups.OrgAdmin;
	const manager = groups.OrgManager;
	const viewer = groups.OrgViewer;
	if (!admin || !manager || !viewer) return null;
	return { admin, manager, viewer };
}

/** Map an old role to the matching seeded group for an org. */
export function groupForRole(
	role: "admin" | "manager" | "viewer",
	groups: OrgSystemGroups,
): IIamGroup {
	if (role === "admin") return groups.admin;
	if (role === "manager") return groups.manager;
	return groups.viewer;
}

/**
 * Auto-join an org owner to that org's OrgAdmin group. Expresses the implicit
 * owner-is-admin rule as data, not a hardcoded branch.
 */
export async function seedOrgOwnerAdmin(
	orgId: string,
	ownerUserId: string,
	session?: ClientSession,
): Promise<boolean> {
	const groups = await seedOrgSystemGroups(orgId, session);
	if (!groups) return false;
	const membership = await addMembershipDB({
		payload: {
			groupId: groups.admin._id.toString(),
			principalType: "user",
			principalId: ownerUserId,
			orgId,
		},
		session,
	});
	return membership !== null;
}

/** Seed the global platform-plane system policies + groups. Idempotent. */
export async function seedPlatformSystemPolicies(
	session?: ClientSession,
): Promise<boolean> {
	const policyIdByName: Record<string, string> = {};
	for (const [name, document] of Object.entries(PLATFORM_POLICY_DOCUMENTS)) {
		const policy = await ensurePolicy(
			{ name, plane: "platform", orgId: null, document },
			session,
		);
		if (!policy) return false;
		policyIdByName[name] = policy._id.toString();
	}

	for (const [groupName, policyNames] of Object.entries(
		PLATFORM_GROUP_POLICIES,
	)) {
		const policyIds = policyNames
			.map((n) => policyIdByName[n])
			.filter((id): id is string => Boolean(id));
		const group = await ensureGroup(
			{ name: groupName, plane: "platform", orgId: null, policyIds },
			session,
		);
		if (!group) return false;
	}
	return true;
}
