import mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
	findIamGroupByNameDB,
	findIamPolicyByNameDB,
	getMembershipsForPrincipalDB,
	isValidPolicyDocument,
	setGroupAttachedPoliciesDB,
} from "../../../src/server/iam/models";
import {
	groupForRole,
	orgAdminDocument,
	orgManagerDocument,
	orgViewerDocument,
	PLATFORM_POLICY_DOCUMENTS,
	seedOrgOwnerAdmin,
	seedOrgSystemGroups,
	seedPlatformSystemPolicies,
} from "../../../src/server/iam/seed/system-policies";
import { clearTestDB, connectTestDB, dropTestDB } from "../../helpers/db";

const oid = () => new mongoose.Types.ObjectId().toString();

beforeAll(async () => {
	await connectTestDB();
});
beforeEach(async () => {
	await clearTestDB();
});
afterAll(async () => {
	await dropTestDB();
});

describe("policy documents", () => {
	it("produces valid, org-scoped documents for each role", () => {
		const orgId = oid();
		for (const doc of [
			orgAdminDocument(orgId),
			orgManagerDocument(orgId),
			orgViewerDocument(orgId),
		]) {
			expect(isValidPolicyDocument(doc)).toBe(true);
			// Every resource pattern is scoped to this org id.
			for (const stmt of doc.statements) {
				for (const res of stmt.resource) {
					expect(res).toContain(`:${orgId}:`);
				}
			}
		}
		// Manager has an explicit Deny over the privileged actions.
		expect(
			orgManagerDocument(orgId).statements.some(
				(s) => s.effect === "Deny",
			),
		).toBe(true);
	});

	it("ships four valid platform policy documents", () => {
		const names = Object.keys(PLATFORM_POLICY_DOCUMENTS);
		expect(names).toEqual([
			"PlatformAdmin",
			"PlatformSupport",
			"PlatformBilling",
			"PlatformIam",
		]);
		for (const doc of Object.values(PLATFORM_POLICY_DOCUMENTS)) {
			expect(isValidPolicyDocument(doc)).toBe(true);
		}
	});
});

describe("seedOrgSystemGroups", () => {
	it("creates admin/manager/viewer groups + policies and is idempotent", async () => {
		const orgId = oid();
		const first = await seedOrgSystemGroups(orgId);
		expect(first).not.toBeNull();
		expect(first?.admin.name).toBe("OrgAdmin");

		const second = await seedOrgSystemGroups(orgId);
		// Same ids on re-run — no duplicates.
		expect(second?.admin._id.toString()).toBe(first?.admin._id.toString());
		expect(second?.viewer._id.toString()).toBe(
			first?.viewer._id.toString(),
		);

		const adminPolicy = await findIamPolicyByNameDB({
			plane: "org",
			orgId,
			name: "OrgAdmin",
		});
		expect(adminPolicy?.managedBy).toBe("system");
	});

	it("repairs attached-policy drift on re-seed", async () => {
		const orgId = oid();
		const groups = await seedOrgSystemGroups(orgId);
		// Corrupt the admin group's attachments.
		await setGroupAttachedPoliciesDB({
			groupId: groups!.admin._id.toString(),
			attachedPolicyIds: [],
		});
		// Re-seed reconciles it back.
		await seedOrgSystemGroups(orgId);
		const repaired = await findIamGroupByNameDB({
			plane: "org",
			orgId,
			name: "OrgAdmin",
		});
		expect(repaired?.attachedPolicyIds).toHaveLength(1);
	});
});

describe("seedOrgOwnerAdmin", () => {
	it("joins the owner to the org's OrgAdmin group", async () => {
		const orgId = oid();
		const ownerId = oid();
		expect(await seedOrgOwnerAdmin(orgId, ownerId)).toBe(true);
		const memberships = await getMembershipsForPrincipalDB({
			principalType: "user",
			principalId: ownerId,
			orgId,
		});
		expect(memberships).toHaveLength(1);
		// Idempotent.
		expect(await seedOrgOwnerAdmin(orgId, ownerId)).toBe(true);
		expect(
			await getMembershipsForPrincipalDB({
				principalType: "user",
				principalId: ownerId,
				orgId,
			}),
		).toHaveLength(1);
	});
});

describe("seedPlatformSystemPolicies", () => {
	it("creates all platform policies and groups, idempotently", async () => {
		expect(await seedPlatformSystemPolicies()).toBe(true);
		expect(await seedPlatformSystemPolicies()).toBe(true);
		for (const name of [
			"platform-admins",
			"platform-support",
			"platform-billing",
			"platform-iam",
		]) {
			const group = await findIamGroupByNameDB({
				plane: "platform",
				orgId: null,
				name,
			});
			expect(group).not.toBeNull();
			expect(group?.attachedPolicyIds.length).toBeGreaterThan(0);
		}
	});
});

describe("groupForRole", () => {
	it("maps each role to its group", async () => {
		const orgId = oid();
		const groups = await seedOrgSystemGroups(orgId);
		expect(groupForRole("admin", groups!)._id.toString()).toBe(
			groups!.admin._id.toString(),
		);
		expect(groupForRole("manager", groups!)._id.toString()).toBe(
			groups!.manager._id.toString(),
		);
		expect(groupForRole("viewer", groups!)._id.toString()).toBe(
			groups!.viewer._id.toString(),
		);
	});
});
