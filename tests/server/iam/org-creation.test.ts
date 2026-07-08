import mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { arn } from "../../../src/server/iam/arn";
import { decide } from "../../../src/server/iam/authorize";
import {
	findIamGroupByNameDB,
	getMembershipsForPrincipalDB,
} from "../../../src/server/iam/models";
import type { AuthResult } from "../../../src/server/lib/auth";
import createOrganization from "../../../src/server/services/organizations/createOrganization";
import { clearTestDB, connectTestDB, dropTestDB } from "../../helpers/db";

const oid = () => new mongoose.Types.ObjectId();

beforeAll(async () => {
	await connectTestDB();
});
beforeEach(async () => {
	await clearTestDB();
});
afterAll(async () => {
	await dropTestDB();
});

describe("createOrganization → IAM seeding", () => {
	it("seeds the org's system groups and grants the owner IAM admin access", async () => {
		const ownerId = oid();
		const doc = await createOrganization({
			payload: {
				ownerId,
				name: `iam-org-${Date.now()}`,
				description: "org that should be IAM-ready",
			},
		});
		const orgId = doc._id.toString();

		// The three system groups exist for this org.
		for (const name of ["OrgAdmin", "OrgManager", "OrgViewer"]) {
			expect(
				await findIamGroupByNameDB({ plane: "org", orgId, name }),
			).not.toBeNull();
		}

		// The owner is a member of OrgAdmin.
		const memberships = await getMembershipsForPrincipalDB({
			principalType: "user",
			principalId: ownerId.toString(),
			orgId,
		});
		expect(memberships).toHaveLength(1);

		// The owner is authorized for a privileged action through the engine.
		const auth: AuthResult = {
			userId: ownerId.toString(),
			token: {
				userId: ownerId.toString(),
			} as unknown as AuthResult["token"],
			refreshed: false,
			effectiveOwnerId: ownerId.toString(),
			organizationId: orgId,
			role: null,
		};
		const d = await decide(auth, "iam:CreateGroup", arn.org.iam(orgId));
		expect(d.decision).toBe("allow");
	});
});
