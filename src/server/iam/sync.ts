import "server-only";
import { principalArnForUser } from "./arn";
import {
	addMembershipDB,
	removeAllMembershipsForPrincipalDB,
	removeMembershipDB,
} from "./models";
import { invalidatePrincipal } from "./resolve";
import { groupForRole, seedOrgSystemGroups } from "./seed/system-policies";

// Keep IAM group memberships in lock-step with organization membership. Authz
// reads the principal's IAM memberships, so a role change or removal in the org
// document MUST be reflected here or the engine would decide on stale grants.
// Every function is best-effort: it must never throw and break the org mutation
// that triggered it (the org document remains the source of truth, and
// `resolveOrgScope` re-derives org scope from it on every request as a backstop).

type OrgRole = "admin" | "manager" | "viewer";

/**
 * Reflect a member joining an org, or changing role, into IAM. Adds the
 * principal to the group matching their role and removes them from the other two
 * SYSTEM groups (custom-group memberships are left untouched). Invalidates the
 * principal's cached effective policies so the next request re-resolves.
 */
export async function syncOrgMemberRole({
	orgId,
	userId,
	role,
}: {
	orgId: string;
	userId: string;
	role: OrgRole;
}): Promise<boolean> {
	try {
		const groups = await seedOrgSystemGroups(orgId);
		if (!groups) return false;

		const target = groupForRole(role, groups);
		const others = [groups.admin, groups.manager, groups.viewer].filter(
			(g) => g._id.toString() !== target._id.toString(),
		);

		await addMembershipDB({
			payload: {
				groupId: target._id.toString(),
				principalType: "user",
				principalId: userId,
				orgId,
			},
		});
		for (const g of others) {
			await removeMembershipDB({
				groupId: g._id.toString(),
				principalType: "user",
				principalId: userId,
				orgId,
			});
		}

		await invalidatePrincipal(principalArnForUser(orgId, userId));
		return true;
	} catch {
		// Defensive: the DB/cache helpers above fail closed internally (return
		// null/0, never throw), so this fires only on an unexpected runtime error.
		/* v8 ignore next */
		return false;
	}
}

/**
 * Reflect a member being removed from an org into IAM: drop ALL of the
 * principal's memberships in that org (system and custom) and invalidate their
 * cache. Best-effort — the org-document removal is the authoritative change.
 */
export async function syncOrgMemberRemoved({
	orgId,
	userId,
}: {
	orgId: string;
	userId: string;
}): Promise<boolean> {
	try {
		await removeAllMembershipsForPrincipalDB({
			principalType: "user",
			principalId: userId,
			orgId,
		});
		await invalidatePrincipal(principalArnForUser(orgId, userId));
		return true;
	} catch {
		// Defensive: helpers fail closed internally; unreachable in practice.
		/* v8 ignore next */
		return false;
	}
}
