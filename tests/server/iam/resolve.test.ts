import mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
	principalArnForOperator,
	principalArnForUser,
} from "../../../src/server/iam/arn";
import {
	addMembershipDB,
	createIamGroupDB,
	createIamPolicyDB,
	setGroupAttachedPoliciesDB,
} from "../../../src/server/iam/models";
import {
	bumpPolicyVersion,
	invalidatePrincipal,
	resolveEffectivePolicies,
} from "../../../src/server/iam/resolve";
import type { PolicyDocument } from "../../../src/server/iam/types";
import { clearTestDB, connectTestDB, dropTestDB } from "../../helpers/db";

const oid = () => new mongoose.Types.ObjectId().toString();

function docFor(orgId: string, action: string): PolicyDocument {
	return {
		version: "2026-01-01",
		statements: [
			{
				effect: "Allow",
				action: [action],
				resource: [`mr:org:*:${orgId}:*/*`],
			},
		],
	};
}

async function attachPolicyToGroup(
	name: string,
	orgId: string,
	document: PolicyDocument,
): Promise<string> {
	const policy = await createIamPolicyDB({
		payload: { name, plane: "org", orgId, managedBy: "customer", document },
	});
	return policy!._id.toString();
}

// NOTE: Redis is shared across vitest workers (only the Mongo DB is per-worker),
// so we must NOT clear the global `iam:*` namespace here — doing so would delete
// other workers' cache entries and the shared `iam:policyVersion` counter,
// racing their assertions. Every test below uses fresh ObjectIds, so its
// principal ARNs (and therefore cache keys) are unique; stale entries from other
// tests are simply never read.

beforeAll(async () => {
	await connectTestDB();
});
beforeEach(async () => {
	await clearTestDB();
});
afterAll(async () => {
	await dropTestDB();
});

describe("resolveEffectivePolicies", () => {
	it("flattens membership → group → policy for an org user", async () => {
		const orgId = oid();
		const userId = oid();
		const pid = await attachPolicyToGroup(
			"P1",
			orgId,
			docFor(orgId, "properties:Read"),
		);
		const group = await createIamGroupDB({
			payload: {
				name: "G1",
				plane: "org",
				orgId,
				managedBy: "customer",
				attachedPolicyIds: [pid],
			},
		});
		await addMembershipDB({
			payload: {
				groupId: group!._id.toString(),
				principalType: "user",
				principalId: userId,
				orgId,
			},
		});

		const resolved = await resolveEffectivePolicies(
			principalArnForUser(orgId, userId),
		);
		expect(resolved).toHaveLength(1);
		expect(resolved[0]?.name).toBe("P1");
		expect(resolved[0]?.document.statements[0]?.action).toEqual([
			"properties:Read",
		]);
	});

	it("caches the result, and only reflects a policy/group edit after a version bump", async () => {
		const orgId = oid();
		const userId = oid();
		const pid1 = await attachPolicyToGroup(
			"A",
			orgId,
			docFor(orgId, "properties:Read"),
		);
		const group = await createIamGroupDB({
			payload: {
				name: "G",
				plane: "org",
				orgId,
				managedBy: "customer",
				attachedPolicyIds: [pid1],
			},
		});
		await addMembershipDB({
			payload: {
				groupId: group!._id.toString(),
				principalType: "user",
				principalId: userId,
				orgId,
			},
		});
		const principalArn = principalArnForUser(orgId, userId);

		// Prime the cache.
		expect(await resolveEffectivePolicies(principalArn)).toHaveLength(1);

		// Add a second policy to the group WITHOUT bumping — read stays cached.
		const pid2 = await attachPolicyToGroup(
			"B",
			orgId,
			docFor(orgId, "properties:Update"),
		);
		await setGroupAttachedPoliciesDB({
			groupId: group!._id.toString(),
			attachedPolicyIds: [pid1, pid2],
		});
		expect(await resolveEffectivePolicies(principalArn)).toHaveLength(1); // stale

		// Bump the global version → the whole old generation is orphaned.
		await bumpPolicyVersion();
		expect(await resolveEffectivePolicies(principalArn)).toHaveLength(2); // fresh
	});

	it("invalidates a single principal's cache entry on membership change", async () => {
		const orgId = oid();
		const userId = oid();
		const pidA = await attachPolicyToGroup(
			"PA",
			orgId,
			docFor(orgId, "properties:Read"),
		);
		const groupA = await createIamGroupDB({
			payload: {
				name: "GA",
				plane: "org",
				orgId,
				managedBy: "customer",
				attachedPolicyIds: [pidA],
			},
		});
		await addMembershipDB({
			payload: {
				groupId: groupA!._id.toString(),
				principalType: "user",
				principalId: userId,
				orgId,
			},
		});
		const principalArn = principalArnForUser(orgId, userId);
		expect(await resolveEffectivePolicies(principalArn)).toHaveLength(1);

		// Join a second group → still cached until the principal is invalidated.
		const pidB = await attachPolicyToGroup(
			"PB",
			orgId,
			docFor(orgId, "units:Read"),
		);
		const groupB = await createIamGroupDB({
			payload: {
				name: "GB",
				plane: "org",
				orgId,
				managedBy: "customer",
				attachedPolicyIds: [pidB],
			},
		});
		await addMembershipDB({
			payload: {
				groupId: groupB!._id.toString(),
				principalType: "user",
				principalId: userId,
				orgId,
			},
		});
		expect(await resolveEffectivePolicies(principalArn)).toHaveLength(1); // stale

		await invalidatePrincipal(principalArn);
		expect(await resolveEffectivePolicies(principalArn)).toHaveLength(2); // fresh
	});

	it("dedupes a policy shared across two groups", async () => {
		const orgId = oid();
		const userId = oid();
		const shared = await attachPolicyToGroup(
			"Shared",
			orgId,
			docFor(orgId, "properties:Read"),
		);
		const g1 = await createIamGroupDB({
			payload: {
				name: "G1",
				plane: "org",
				orgId,
				managedBy: "customer",
				attachedPolicyIds: [shared],
			},
		});
		const g2 = await createIamGroupDB({
			payload: {
				name: "G2",
				plane: "org",
				orgId,
				managedBy: "customer",
				attachedPolicyIds: [shared],
			},
		});
		for (const g of [g1, g2]) {
			await addMembershipDB({
				payload: {
					groupId: g!._id.toString(),
					principalType: "user",
					principalId: userId,
					orgId,
				},
			});
		}
		const resolved = await resolveEffectivePolicies(
			principalArnForUser(orgId, userId),
		);
		expect(resolved).toHaveLength(1);
	});

	it("resolves an operator (platform plane, null org scope)", async () => {
		const userId = oid();
		const pid = await attachPolicyToGroup(
			"PlatP",
			oid(),
			docFor(oid(), "iam:List"),
		);
		// Platform policy scope is null; reuse the helper's policy id in a platform group.
		const group = await createIamGroupDB({
			payload: {
				name: "platform-admins",
				plane: "platform",
				orgId: null,
				managedBy: "system",
				attachedPolicyIds: [pid],
			},
		});
		await addMembershipDB({
			payload: {
				groupId: group!._id.toString(),
				principalType: "operator",
				principalId: userId,
				orgId: null,
			},
		});
		const resolved = await resolveEffectivePolicies(
			principalArnForOperator(userId),
		);
		expect(resolved).toHaveLength(1);
	});

	it("returns an empty set for unknown principals, no groups, or malformed ARNs", async () => {
		expect(await resolveEffectivePolicies("garbage")).toEqual([]);
		expect(
			await resolveEffectivePolicies(principalArnForUser(oid(), oid())),
		).toEqual([]);

		// Membership to a group that has no attached policies → empty.
		const orgId = oid();
		const userId = oid();
		const group = await createIamGroupDB({
			payload: {
				name: "Empty",
				plane: "org",
				orgId,
				managedBy: "customer",
			},
		});
		await addMembershipDB({
			payload: {
				groupId: group!._id.toString(),
				principalType: "user",
				principalId: userId,
				orgId,
			},
		});
		expect(
			await resolveEffectivePolicies(principalArnForUser(orgId, userId)),
		).toEqual([]);
	});
});
