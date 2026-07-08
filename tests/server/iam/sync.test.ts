import mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { arn } from "../../../src/server/iam/arn";
import { decide } from "../../../src/server/iam/authorize";
import { getMembershipsForPrincipalDB } from "../../../src/server/iam/models";
import { seedOrgSystemGroups } from "../../../src/server/iam/seed/system-policies";
import {
	syncOrgMemberRemoved,
	syncOrgMemberRole,
} from "../../../src/server/iam/sync";
import type { AuthResult } from "../../../src/server/lib/auth";
import { clearTestDB, connectTestDB, dropTestDB } from "../../helpers/db";

const oid = () => new mongoose.Types.ObjectId().toString();

function orgAuth(userId: string, orgId: string): AuthResult {
	return {
		userId,
		token: { userId } as unknown as AuthResult["token"],
		refreshed: false,
		effectiveOwnerId: userId,
		organizationId: orgId,
		role: null,
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

describe("syncOrgMemberRole", () => {
	it("adds a joining member to exactly the group for their role", async () => {
		const orgId = oid();
		const userId = oid();
		const groups = await seedOrgSystemGroups(orgId);

		expect(await syncOrgMemberRole({ orgId, userId, role: "viewer" })).toBe(
			true,
		);

		const rows = await getMembershipsForPrincipalDB({
			principalType: "user",
			principalId: userId,
			orgId,
		});
		expect(rows).toHaveLength(1);
		expect(rows[0]?.groupId.toString()).toBe(
			groups!.viewer._id.toString(),
		);

		// A viewer can read but not write through the engine.
		const auth = orgAuth(userId, orgId);
		expect(
			(await decide(auth, "properties:List", arn.org.properties(orgId)))
				.decision,
		).toBe("allow");
		expect(
			(
				await decide(
					auth,
					"properties:Update",
					arn.org.properties(orgId, oid()),
				)
			).decision,
		).toBe("deny");
	});

	it("moves the member between system groups on a role change (never duplicates)", async () => {
		const orgId = oid();
		const userId = oid();
		const groups = await seedOrgSystemGroups(orgId);

		await syncOrgMemberRole({ orgId, userId, role: "viewer" });
		await syncOrgMemberRole({ orgId, userId, role: "admin" });

		const rows = await getMembershipsForPrincipalDB({
			principalType: "user",
			principalId: userId,
			orgId,
		});
		expect(rows).toHaveLength(1);
		expect(rows[0]?.groupId.toString()).toBe(groups!.admin._id.toString());

		// Now an admin: privileged actions resolve to allow.
		const auth = orgAuth(userId, orgId);
		expect(
			(await decide(auth, "iam:CreateGroup", arn.org.iam(orgId))).decision,
		).toBe("allow");
	});

	it("returns false when the org's groups cannot be resolved for a malformed org id", async () => {
		expect(
			await syncOrgMemberRole({
				orgId: "not-an-oid",
				userId: oid(),
				role: "viewer",
			}),
		).toBe(false);
	});
});

describe("syncOrgMemberRemoved", () => {
	it("drops every membership the principal holds in the org", async () => {
		const orgId = oid();
		const userId = oid();
		await seedOrgSystemGroups(orgId);
		await syncOrgMemberRole({ orgId, userId, role: "manager" });

		expect(await syncOrgMemberRemoved({ orgId, userId })).toBe(true);

		const rows = await getMembershipsForPrincipalDB({
			principalType: "user",
			principalId: userId,
			orgId,
		});
		expect(rows).toHaveLength(0);

		// With no membership the org user is denied by default-deny.
		const auth = orgAuth(userId, orgId);
		expect(
			(await decide(auth, "properties:List", arn.org.properties(orgId)))
				.decision,
		).toBe("deny");
	});

	it("is a no-op that still succeeds for a principal with no memberships", async () => {
		expect(
			await syncOrgMemberRemoved({ orgId: oid(), userId: oid() }),
		).toBe(true);
	});
});
