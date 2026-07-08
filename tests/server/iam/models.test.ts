import mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
	addMembershipDB,
	countIamOperatorsDB,
	createIamGroupDB,
	createIamOperatorDB,
	createIamPolicyDB,
	findIamGroupByNameDB,
	findIamPolicyByNameDB,
	getIamGroupsByIdsDB,
	getIamOperatorByUserIdDB,
	getIamPoliciesByIdsDB,
	getMembershipsForPrincipalDB,
	IamGroupMembership,
	isValidPolicyDocument,
	parsePolicyDocument,
	removeMembershipDB,
	setGroupAttachedPoliciesDB,
	setIamOperatorStatusDB,
	updateIamPolicyDocumentDB,
} from "../../../src/server/iam/models";
import type { PolicyDocument } from "../../../src/server/iam/types";
import { clearTestDB, connectTestDB, dropTestDB } from "../../helpers/db";

const oid = () => new mongoose.Types.ObjectId().toString();

// orgId is stored as an ObjectId, so tests must use real 24-hex ids.
const ORG = oid();
const ORG2 = oid();

const doc: PolicyDocument = {
	version: "2026-01-01",
	statements: [
		{
			effect: "Allow",
			action: ["properties:Read"],
			resource: [`mr:org:*:${ORG}:*/*`],
		},
	],
};

beforeAll(async () => {
	await connectTestDB();
});
beforeEach(async () => {
	await clearTestDB();
});
afterAll(async () => {
	await dropTestDB();
});

describe("policy validation", () => {
	it("accepts a well-formed document and rejects malformed ones", () => {
		expect(isValidPolicyDocument(doc)).toBe(true);
		expect(parsePolicyDocument(doc)).toEqual(doc);
		expect(isValidPolicyDocument({ version: "1", statements: [] })).toBe(
			false,
		);
		expect(
			isValidPolicyDocument({
				version: "1",
				statements: [
					{ effect: "Maybe", action: ["x"], resource: ["y"] },
				],
			}),
		).toBe(false);
		expect(isValidPolicyDocument({ statements: [] })).toBe(false);
		expect(() => parsePolicyDocument({ bad: true })).toThrow();
	});
});

describe("IamPolicy", () => {
	it("creates, reads by id, finds by name, and rejects invalid documents on write", async () => {
		const created = await createIamPolicyDB({
			payload: {
				name: "OrgAdmin",
				plane: "org",
				orgId: ORG,
				managedBy: "system",
				document: doc,
			},
		});
		expect(created).not.toBeNull();
		expect(created?.orgId?.toString()).toBeTruthy();

		const byId = await getIamPoliciesByIdsDB({ ids: [created!._id] });
		expect(byId).toHaveLength(1);
		expect(byId[0]?.name).toBe("OrgAdmin");

		const byName = await findIamPolicyByNameDB({
			plane: "org",
			orgId: ORG,
			name: "OrgAdmin",
		});
		expect(byName?._id.toString()).toBe(created!._id.toString());

		// Malformed document is rejected before insert.
		const bad = await createIamPolicyDB({
			payload: {
				name: "Bad",
				plane: "org",
				orgId: ORG,
				managedBy: "customer",
				document: {
					version: "1",
					statements: [],
				} as unknown as PolicyDocument,
			},
		});
		expect(bad).toBeNull();
	});

	it("stores platform (orgId null) policies and enforces name uniqueness per plane/org", async () => {
		const p = await createIamPolicyDB({
			payload: {
				name: "PlatformAdmin",
				plane: "platform",
				orgId: null,
				managedBy: "system",
				document: doc,
			},
		});
		expect(p?.orgId).toBeNull();
		const dup = await createIamPolicyDB({
			payload: {
				name: "PlatformAdmin",
				plane: "platform",
				orgId: null,
				managedBy: "system",
				document: doc,
			},
		});
		expect(dup).toBeNull(); // unique index violation â†’ null
	});

	it("updates only customer-managed policy documents", async () => {
		const sys = await createIamPolicyDB({
			payload: {
				name: "SysP",
				plane: "org",
				orgId: ORG,
				managedBy: "system",
				document: doc,
			},
		});
		const cust = await createIamPolicyDB({
			payload: {
				name: "CustP",
				plane: "org",
				orgId: ORG,
				managedBy: "customer",
				document: doc,
			},
		});
		const newDoc: PolicyDocument = {
			version: "2026-01-01",
			statements: [
				{ effect: "Deny", action: ["*"], resource: ["mr:org:*:1:*/*"] },
			],
		};

		// System policy is immutable from this path.
		expect(
			await updateIamPolicyDocumentDB({
				id: sys!._id.toString(),
				document: newDoc,
			}),
		).toBeNull();

		const updated = await updateIamPolicyDocumentDB({
			id: cust!._id.toString(),
			document: newDoc,
		});
		expect(updated?.document.statements[0]?.effect).toBe("Deny");

		// Invalid replacement is rejected.
		expect(
			await updateIamPolicyDocumentDB({
				id: cust!._id.toString(),
				document: {
					version: "1",
					statements: [],
				} as unknown as PolicyDocument,
			}),
		).toBeNull();
	});

	it("returns empty / null on bad input rather than throwing", async () => {
		expect(await getIamPoliciesByIdsDB({ ids: ["not-an-oid"] })).toEqual(
			[],
		);
		expect(
			await findIamPolicyByNameDB({
				plane: "org",
				orgId: "nope",
				name: "x",
			}),
		).toBeNull();
		expect(
			await updateIamPolicyDocumentDB({
				id: "not-an-oid",
				document: doc,
			}),
		).toBeNull();
	});
});

describe("IamGroup", () => {
	it("creates, sets attached policies, reads by ids, finds by name", async () => {
		const pid = oid();
		const group = await createIamGroupDB({
			payload: {
				name: "OrgAdmin",
				plane: "org",
				orgId: ORG,
				managedBy: "system",
				attachedPolicyIds: [pid],
			},
		});
		expect(group?.attachedPolicyIds.map((x) => x.toString())).toEqual([
			pid,
		]);

		const pid2 = oid();
		const updated = await setGroupAttachedPoliciesDB({
			groupId: group!._id.toString(),
			attachedPolicyIds: [pid, pid2],
		});
		expect(updated?.attachedPolicyIds).toHaveLength(2);

		const byId = await getIamGroupsByIdsDB({ ids: [group!._id] });
		expect(byId[0]?.name).toBe("OrgAdmin");
		const byName = await findIamGroupByNameDB({
			plane: "org",
			orgId: ORG,
			name: "OrgAdmin",
		});
		expect(byName?._id.toString()).toBe(group!._id.toString());
	});

	it("defaults attachedPolicyIds to [] and fails soft on bad input", async () => {
		const g = await createIamGroupDB({
			payload: {
				name: "Empty",
				plane: "platform",
				orgId: null,
				managedBy: "system",
			},
		});
		expect(g?.attachedPolicyIds).toEqual([]);
		expect(
			await setGroupAttachedPoliciesDB({
				groupId: "bad",
				attachedPolicyIds: [],
			}),
		).toBeNull();
		expect(await getIamGroupsByIdsDB({ ids: ["bad"] })).toEqual([]);
		expect(
			await findIamGroupByNameDB({
				plane: "org",
				orgId: null,
				name: "none",
			}),
		).toBeNull();
	});
});

describe("IamGroupMembership", () => {
	it("adds idempotently, lists for a principal, and removes", async () => {
		const groupId = oid();
		const userId = oid();
		const first = await addMembershipDB({
			payload: {
				groupId,
				principalType: "user",
				principalId: userId,
				orgId: ORG,
			},
		});
		const second = await addMembershipDB({
			payload: {
				groupId,
				principalType: "user",
				principalId: userId,
				orgId: ORG,
			},
		});
		expect(first?._id.toString()).toBe(second?._id.toString()); // upsert, not dup
		expect(await IamGroupMembership.countDocuments({})).toBe(1);

		const rows = await getMembershipsForPrincipalDB({
			principalType: "user",
			principalId: userId,
			orgId: ORG,
		});
		expect(rows).toHaveLength(1);

		expect(
			await removeMembershipDB({
				groupId,
				principalType: "user",
				principalId: userId,
				orgId: ORG,
			}),
		).toBe(true);
		expect(await IamGroupMembership.countDocuments({})).toBe(0);
	});

	it("scopes memberships by org and handles operator (null org) principals", async () => {
		const groupId = oid();
		const opId = oid();
		await addMembershipDB({
			payload: {
				groupId,
				principalType: "operator",
				principalId: opId,
				orgId: null,
			},
		});
		const opRows = await getMembershipsForPrincipalDB({
			principalType: "operator",
			principalId: opId,
			orgId: null,
		});
		expect(opRows).toHaveLength(1);
		// A user query in a different org sees nothing.
		expect(
			await getMembershipsForPrincipalDB({
				principalType: "user",
				principalId: opId,
				orgId: ORG2,
			}),
		).toHaveLength(0);
	});

	it("fails soft on invalid ids", async () => {
		expect(
			await addMembershipDB({
				payload: {
					groupId: "bad",
					principalType: "user",
					principalId: "bad",
				},
			}),
		).toBeNull();
		expect(
			await removeMembershipDB({
				groupId: "bad",
				principalType: "user",
				principalId: "bad",
			}),
		).toBe(false);
		expect(
			await getMembershipsForPrincipalDB({
				principalType: "user",
				principalId: "bad",
			}),
		).toEqual([]);
	});
});

describe("IamOperator", () => {
	it("creates uniquely, counts, reads, and toggles status", async () => {
		const userId = oid();
		expect(await countIamOperatorsDB()).toBe(0);
		const op = await createIamOperatorDB({ payload: { userId } });
		expect(op?.status).toBe("active");
		expect(await countIamOperatorsDB()).toBe(1);

		// Duplicate userId rejected by unique index.
		expect(await createIamOperatorDB({ payload: { userId } })).toBeNull();

		const read = await getIamOperatorByUserIdDB({ userId });
		expect(read?._id.toString()).toBe(op!._id.toString());

		const disabled = await setIamOperatorStatusDB({
			userId,
			status: "disabled",
		});
		expect(disabled?.status).toBe("disabled");
	});

	it("fails soft on bad input", async () => {
		expect(
			await createIamOperatorDB({ payload: { userId: "bad" } }),
		).toBeNull();
		expect(await getIamOperatorByUserIdDB({ userId: "bad" })).toBeNull();
		expect(
			await setIamOperatorStatusDB({ userId: "bad", status: "active" }),
		).toBeNull();
	});
});
