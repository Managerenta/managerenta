import mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { arn } from "../../../src/server/iam/arn";
import { decide } from "../../../src/server/iam/authorize";
import { migrateRolesToIam } from "../../../src/server/iam/migrate/roles-to-iam";
import { IamGroupMembership } from "../../../src/server/iam/models";
import type { AuthResult } from "../../../src/server/lib/auth";
import { Organization } from "../../../src/server/models/organizations";
import { IOrganizationRole } from "../../../src/server/models/organizations/types";
import { clearTestDB, connectTestDB, dropTestDB } from "../../helpers/db";

const oid = () => new mongoose.Types.ObjectId();

// Redis is shared across workers; rely on unique ObjectIds for isolation rather
// than clearing the global `iam:*` namespace.

function authFor(userId: string, orgId: string, ownerId: string): AuthResult {
	return {
		userId,
		token: { userId } as unknown as AuthResult["token"],
		refreshed: false,
		effectiveOwnerId: ownerId,
		organizationId: orgId,
		role: null,
	};
}

// Reference expectation of the OLD role semantics: [role][action] â†’ allow?
const LEGACY: Record<string, Record<string, boolean>> = {
	admin: {
		"properties:Read": true,
		"properties:Update": true,
		"properties:Delete": true,
		"iam:CreateGroup": true,
		"organizations:RemoveMember": true,
	},
	manager: {
		"properties:Read": true,
		"properties:Update": true,
		"properties:Delete": true,
		"iam:CreateGroup": false,
		"organizations:RemoveMember": false,
	},
	viewer: {
		"properties:Read": true,
		"properties:Update": false,
		"properties:Delete": false,
		"iam:CreateGroup": false,
		"organizations:RemoveMember": false,
	},
};

function resourceFor(action: string, orgId: string): string {
	const service = action.split(":")[0] as
		| "properties"
		| "iam"
		| "organizations";
	return arn.org[service](orgId, "*");
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

describe("migrateRolesToIam", () => {
	it("dry run reports counts without writing memberships", async () => {
		const ownerId = oid();
		await Organization.create({
			ownerId,
			name: `dry-${Date.now()}`,
			description: "dry run org",
			members: [
				{ memberId: oid(), permission: IOrganizationRole.ADMIN },
				{ memberId: oid(), permission: IOrganizationRole.VIEWER },
			],
		});

		const report = await migrateRolesToIam({ dryRun: true });
		expect(report.dryRun).toBe(true);
		expect(report.organizations).toBe(1);
		expect(report.owners).toBe(1);
		expect(report.members).toBe(2);
		expect(await IamGroupMembership.countDocuments({})).toBe(0);
	});

	it("preserves effective access exactly for owner + every role (equivalence proof)", async () => {
		const ownerId = oid();
		const adminId = oid();
		const managerId = oid();
		const viewerId = oid();
		const org = await Organization.create({
			ownerId,
			name: `equiv-${Date.now()}`,
			description: "equivalence org",
			members: [
				{ memberId: adminId, permission: IOrganizationRole.ADMIN },
				{ memberId: managerId, permission: IOrganizationRole.MANAGER },
				{ memberId: viewerId, permission: IOrganizationRole.VIEWER },
			],
		});
		const orgId = org._id.toString();

		const report = await migrateRolesToIam();
		expect(report.organizations).toBe(1);
		expect(report.owners).toBe(1);
		expect(report.members).toBe(3);

		const subjects: Array<{ id: string; role: keyof typeof LEGACY }> = [
			{ id: ownerId.toString(), role: "admin" }, // owner â‰¡ admin
			{ id: adminId.toString(), role: "admin" },
			{ id: managerId.toString(), role: "manager" },
			{ id: viewerId.toString(), role: "viewer" },
		];

		for (const subject of subjects) {
			const auth = authFor(subject.id, orgId, ownerId.toString());
			for (const [action, expected] of Object.entries(
				LEGACY[subject.role],
			)) {
				const d = await decide(
					auth,
					action,
					resourceFor(action, orgId),
				);
				expect(
					d.decision === "allow",
					`${subject.role} ${action} expected allow=${expected} but got ${d.decision} (${d.reason})`,
				).toBe(expected);
			}
		}
	});

	it("is idempotent â€” re-running does not duplicate memberships", async () => {
		const ownerId = oid();
		await Organization.create({
			ownerId,
			name: `idem-${Date.now()}`,
			description: "idempotent org",
			members: [
				{ memberId: oid(), permission: IOrganizationRole.MANAGER },
			],
		});
		await migrateRolesToIam();
		const afterFirst = await IamGroupMembership.countDocuments({});
		await migrateRolesToIam();
		const afterSecond = await IamGroupMembership.countDocuments({});
		expect(afterSecond).toBe(afterFirst);
		// owner + 1 member = 2 memberships.
		expect(afterFirst).toBe(2);
	});
});
