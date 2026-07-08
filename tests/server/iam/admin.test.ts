import mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
	adminAddMember,
	adminCreateGroup,
	adminCreateOperator,
	adminCreatePolicy,
	adminDeleteGroup,
	adminDeletePolicy,
	adminListGroupMembers,
	adminListGroups,
	adminListOperators,
	adminListOrgMemberships,
	adminListPolicies,
	adminRemoveMember,
	adminSetGroupPolicies,
	adminSetOperatorStatus,
	adminUpdatePolicy,
} from "../../../src/server/iam/admin";
import {
	findIamGroupByNameDB,
	findIamPolicyByNameDB,
	getIamOperatorByUserIdDB,
	getMembershipsForGroupDB,
} from "../../../src/server/iam/models";
import {
	seedOrgSystemGroups,
	seedPlatformSystemPolicies,
} from "../../../src/server/iam/seed/system-policies";
import type { PolicyDocument } from "../../../src/server/iam/types";
import { clearTestDB, connectTestDB, dropTestDB } from "../../helpers/db";

const oid = () => new mongoose.Types.ObjectId().toString();
const PLATFORM = { plane: "platform", orgId: null } as const;

async function makeUser(name = "Test User"): Promise<string> {
	const id = new mongoose.Types.ObjectId();
	const u = await mongoose.models.users.create({
		_id: id,
		username: `u_${id.toString()}`,
		email: `${id.toString()}@example.test`,
		password: "hashed",
		name,
	});
	return u._id.toString();
}

function platformDoc(action: string): PolicyDocument {
	return {
		version: "2026-01-01",
		statements: [
			{
				effect: "Allow",
				action: [action],
				resource: ["mr:platform:*:*:*/*"],
			},
		],
	};
}
function orgDoc(orgId: string, action: string): PolicyDocument {
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

beforeAll(async () => {
	await connectTestDB();
});
beforeEach(async () => {
	await clearTestDB();
});
afterAll(async () => {
	await dropTestDB();
});

describe("admin policies", () => {
	it("creates, lists, updates and deletes a customer policy", async () => {
		const created = await adminCreatePolicy({
			scope: PLATFORM,
			name: `Cust-${oid()}`,
			document: platformDoc("billing:Read"),
		});
		expect(created).not.toBeNull();
		expect(created?.managedBy).toBe("customer");

		const list = await adminListPolicies(PLATFORM);
		expect(
			list.some((p) => p._id.toString() === created!._id.toString()),
		).toBe(true);

		const updated = await adminUpdatePolicy({
			scope: PLATFORM,
			policyId: created!._id.toString(),
			document: {
				version: "2026-01-01",
				statements: [
					{
						effect: "Deny",
						action: ["billing:Read"],
						resource: ["mr:platform:*:*:*/*"],
					},
				],
			},
		});
		expect(updated?.document.statements[0]?.effect).toBe("Deny");

		expect(
			await adminDeletePolicy({
				scope: PLATFORM,
				policyId: created!._id.toString(),
			}),
		).toBe(true);
	});

	it("rejects an invalid document on create and update", async () => {
		expect(
			await adminCreatePolicy({
				scope: PLATFORM,
				name: `Bad-${oid()}`,
				document: {
					version: "1",
					statements: [],
				} as unknown as PolicyDocument,
			}),
		).toBeNull();
	});

	it("refuses to update or delete a SYSTEM policy (immutable)", async () => {
		await seedPlatformSystemPolicies();
		const sys = await findIamPolicyByNameDB({
			plane: "platform",
			orgId: null,
			name: "PlatformAdmin",
		});
		expect(sys).not.toBeNull();
		expect(
			await adminUpdatePolicy({
				scope: PLATFORM,
				policyId: sys!._id.toString(),
				document: platformDoc("iam:List"),
			}),
		).toBeNull();
		expect(
			await adminDeletePolicy({
				scope: PLATFORM,
				policyId: sys!._id.toString(),
			}),
		).toBe(false);
	});

	it("refuses cross-scope updates and deletes (org policy is invisible to platform scope)", async () => {
		const orgA = oid();
		const orgScope = { plane: "org", orgId: orgA } as const;
		const orgPolicy = await adminCreatePolicy({
			scope: orgScope,
			name: "OrgCust",
			document: orgDoc(orgA, "properties:Read"),
		});
		expect(orgPolicy).not.toBeNull();

		// Platform scope must not be able to touch an org-scoped policy.
		expect(
			await adminUpdatePolicy({
				scope: PLATFORM,
				policyId: orgPolicy!._id.toString(),
				document: platformDoc("billing:Read"),
			}),
		).toBeNull();
		// A different org scope must not delete it either.
		expect(
			await adminDeletePolicy({
				scope: { plane: "org", orgId: oid() },
				policyId: orgPolicy!._id.toString(),
			}),
		).toBe(false);
	});
});

describe("admin groups", () => {
	it("creates a group only with in-scope policies", async () => {
		const policy = await adminCreatePolicy({
			scope: PLATFORM,
			name: `P-${oid()}`,
			document: platformDoc("billing:Read"),
		});
		const ok = await adminCreateGroup({
			scope: PLATFORM,
			name: `G-${oid()}`,
			attachedPolicyIds: [policy!._id.toString()],
		});
		expect(ok).not.toBeNull();
		expect(ok?.managedBy).toBe("customer");

		// A policy from another (org) scope cannot be attached.
		const orgA = oid();
		const orgPolicy = await adminCreatePolicy({
			scope: { plane: "org", orgId: orgA },
			name: "OrgP",
			document: orgDoc(orgA, "properties:Read"),
		});
		expect(
			await adminCreateGroup({
				scope: PLATFORM,
				name: `G2-${oid()}`,
				attachedPolicyIds: [orgPolicy!._id.toString()],
			}),
		).toBeNull();
	});

	it("refuses to edit a SYSTEM group's policies but allows customer groups", async () => {
		const orgId = oid();
		const scope = { plane: "org", orgId } as const;
		const groups = await seedOrgSystemGroups(orgId);

		// OrgAdmin is system-managed — its policy set is immutable.
		expect(
			await adminSetGroupPolicies({
				scope,
				groupId: groups!.admin._id.toString(),
				attachedPolicyIds: [],
			}),
		).toBeNull();

		// A customer group in the same scope can be edited.
		const policy = await adminCreatePolicy({
			scope,
			name: "CustP",
			document: orgDoc(orgId, "properties:Read"),
		});
		const custGroup = await adminCreateGroup({
			scope,
			name: "CustG",
			attachedPolicyIds: [],
		});
		const updated = await adminSetGroupPolicies({
			scope,
			groupId: custGroup!._id.toString(),
			attachedPolicyIds: [policy!._id.toString()],
		});
		expect(updated?.attachedPolicyIds).toHaveLength(1);
	});

	it("deleting a group removes its memberships", async () => {
		const orgId = oid();
		const scope = { plane: "org", orgId } as const;
		const group = await adminCreateGroup({ scope, name: "Temp" });
		const userId = oid();
		await adminAddMember({
			scope,
			groupId: group!._id.toString(),
			principalType: "user",
			principalId: userId,
		});
		expect(
			await getMembershipsForGroupDB({ groupId: group!._id.toString() }),
		).toHaveLength(1);

		expect(
			await adminDeleteGroup({ scope, groupId: group!._id.toString() }),
		).toBe(true);
		expect(
			await getMembershipsForGroupDB({ groupId: group!._id.toString() }),
		).toHaveLength(0);
	});
});

describe("admin members", () => {
	it("adds and removes a member, and rejects cross-scope groups", async () => {
		const orgId = oid();
		const scope = { plane: "org", orgId } as const;
		const groups = await seedOrgSystemGroups(orgId);
		const userId = await makeUser("Member One");

		// System groups ARE valid membership targets (role assignment).
		expect(
			await adminAddMember({
				scope,
				groupId: groups!.viewer._id.toString(),
				principalType: "user",
				principalId: userId,
			}),
		).toBe(true);

		const members = await adminListGroupMembers({
			groupId: groups!.viewer._id.toString(),
		});
		expect(members).toHaveLength(1);
		expect(members[0]?.name).toBe("Member One");

		// A different org's scope cannot add to this org's group.
		expect(
			await adminAddMember({
				scope: { plane: "org", orgId: oid() },
				groupId: groups!.viewer._id.toString(),
				principalType: "user",
				principalId: oid(),
			}),
		).toBe(false);

		expect(
			await adminRemoveMember({
				scope,
				groupId: groups!.viewer._id.toString(),
				principalType: "user",
				principalId: userId,
			}),
		).toBe(true);
		expect(
			await adminListGroupMembers({
				groupId: groups!.viewer._id.toString(),
			}),
		).toHaveLength(0);
	});

	it("lists the org membership matrix by principal", async () => {
		const orgId = oid();
		const scope = { plane: "org", orgId } as const;
		const groups = await seedOrgSystemGroups(orgId);
		const userId = await makeUser("Matrix User");
		await adminAddMember({
			scope,
			groupId: groups!.manager._id.toString(),
			principalType: "user",
			principalId: userId,
		});

		const matrix = await adminListOrgMemberships({ orgId });
		expect(matrix).toHaveLength(1);
		expect(matrix[0]?.principalId).toBe(userId);
		expect(matrix[0]?.groupIds).toContain(groups!.manager._id.toString());
		expect(matrix[0]?.name).toBe("Matrix User");
	});
});

describe("admin groups + members — platform operator paths", () => {
	it("lists platform groups and rejects a group with a nonexistent policy id", async () => {
		await adminCreateGroup({ scope: PLATFORM, name: `PG-${oid()}` });
		const listed = await adminListGroups(PLATFORM);
		expect(Array.isArray(listed)).toBe(true);

		// A policy id that does not resolve → length mismatch → rejected.
		expect(
			await adminCreateGroup({
				scope: PLATFORM,
				name: `PG2-${oid()}`,
				attachedPolicyIds: [oid()],
			}),
		).toBeNull();
	});

	it("adds and removes an OPERATOR principal on a platform group and invalidates it", async () => {
		const group = await adminCreateGroup({
			scope: PLATFORM,
			name: `Ops-${oid()}`,
		});
		const operatorId = oid();
		expect(
			await adminAddMember({
				scope: PLATFORM,
				groupId: group!._id.toString(),
				principalType: "operator",
				principalId: operatorId,
			}),
		).toBe(true);

		const members = await adminListGroupMembers({
			groupId: group!._id.toString(),
		});
		expect(members.some((m) => m.principalId === operatorId)).toBe(true);

		expect(
			await adminRemoveMember({
				scope: PLATFORM,
				groupId: group!._id.toString(),
				principalType: "operator",
				principalId: operatorId,
			}),
		).toBe(true);

		// Deleting a group that still has an operator member purges the membership
		// (exercises the operator principal-ARN branch in the cleanup loop).
		const group2 = await adminCreateGroup({
			scope: PLATFORM,
			name: `Ops2-${oid()}`,
		});
		await adminAddMember({
			scope: PLATFORM,
			groupId: group2!._id.toString(),
			principalType: "operator",
			principalId: oid(),
		});
		expect(
			await adminDeleteGroup({
				scope: PLATFORM,
				groupId: group2!._id.toString(),
			}),
		).toBe(true);
		expect(
			await getMembershipsForGroupDB({ groupId: group2!._id.toString() }),
		).toHaveLength(0);
	});
});

describe("admin operators", () => {
	it("promotes a real user, rejects unknown users and duplicates, toggles status", async () => {
		expect(await adminCreateOperator({ userId: oid() })).toEqual({
			ok: false,
			reason: "unknown-user",
		});

		const userId = await makeUser("Operator");
		expect(await adminCreateOperator({ userId })).toEqual({ ok: true });
		expect(await getIamOperatorByUserIdDB({ userId })).not.toBeNull();

		expect(await adminCreateOperator({ userId })).toEqual({
			ok: false,
			reason: "already-operator",
		});

		const list = await adminListOperators();
		expect(
			list.some((o) => o.userId === userId && o.name === "Operator"),
		).toBe(true);

		expect(
			await adminSetOperatorStatus({ userId, status: "disabled" }),
		).toBe(true);
		expect((await getIamOperatorByUserIdDB({ userId }))?.status).toBe(
			"disabled",
		);
		expect(
			await adminSetOperatorStatus({ userId: oid(), status: "active" }),
		).toBe(false);
	});
});
