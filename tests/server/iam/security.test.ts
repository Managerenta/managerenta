import mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { adminCreatePolicy } from "../../../src/server/iam/admin";
import { arn } from "../../../src/server/iam/arn";
import { decide } from "../../../src/server/iam/authorize";
import {
	addMembershipDB,
	createIamGroupDB,
	createIamPolicyDB,
	findIamPolicyByNameDB,
} from "../../../src/server/iam/models";
import {
	orgAdminDocument,
	seedOrgSystemGroups,
} from "../../../src/server/iam/seed/system-policies";
import type { PolicyDocument } from "../../../src/server/iam/types";
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

describe("tenant-isolation: engine cross-scope guard", () => {
	it("denies an org-A principal acting on org-B resources EVEN WITH a wildcard-resource policy", async () => {
		const orgA = oid();
		const orgB = oid();
		const attacker = oid();

		// Simulate a maliciously-broad customer policy already present in org A.
		const evil = await createIamPolicyDB({
			payload: {
				name: "Evil",
				plane: "org",
				orgId: orgA,
				managedBy: "customer",
				document: {
					version: "2026-01-01",
					statements: [
						{
							effect: "Allow",
							action: ["*"],
							resource: ["mr:org:*:*:*/*"],
						},
					],
				},
			},
		});
		const group = await createIamGroupDB({
			payload: {
				name: "EvilG",
				plane: "org",
				orgId: orgA,
				managedBy: "customer",
				attachedPolicyIds: [evil!._id.toString()],
			},
		});
		await addMembershipDB({
			payload: {
				groupId: group!._id.toString(),
				principalType: "user",
				principalId: attacker,
				orgId: orgA,
			},
		});

		const auth = orgAuth(attacker, orgA);
		// Same-org: the wildcard policy grants access (sanity).
		expect(
			(await decide(auth, "iam:AddMember", arn.org.iam(orgA))).decision,
		).toBe("allow");
		// Cross-org: denied by the engine boundary regardless of policy content.
		const d = await decide(auth, "iam:AddMember", arn.org.iam(orgB));
		expect(d.decision).toBe("deny");
		expect(d.reason).toMatch(/cross-scope/);
	});

	it("denies a personal-scope user from reaching any org's resources", async () => {
		const userId = oid();
		const auth: AuthResult = {
			userId,
			token: { userId } as unknown as AuthResult["token"],
			refreshed: false,
			effectiveOwnerId: userId,
			organizationId: null,
			role: null,
		};
		// Their own personal resource is allowed…
		expect(
			(await decide(auth, "properties:List", arn.org.properties(userId)))
				.decision,
		).toBe("allow");
		// …but an org's resource (orgId ≠ their userId) is denied.
		expect(
			(await decide(auth, "properties:List", arn.org.properties(oid())))
				.decision,
		).toBe("deny");
	});
});

describe("admin policy authoring is confined to the caller's scope", () => {
	it("rejects wildcard/foreign-org resources and accepts in-scope ones", async () => {
		const orgA = oid();
		const scope = { plane: "org", orgId: orgA } as const;

		const wildcard: PolicyDocument = {
			version: "2026-01-01",
			statements: [
				{
					effect: "Allow",
					action: ["*"],
					resource: ["mr:org:*:*:*/*"],
				},
			],
		};
		expect(
			await adminCreatePolicy({ scope, name: "W", document: wildcard }),
		).toBeNull();

		const foreign: PolicyDocument = {
			version: "2026-01-01",
			statements: [
				{
					effect: "Allow",
					action: ["*"],
					resource: [`mr:org:*:${oid()}:*/*`],
				},
			],
		};
		expect(
			await adminCreatePolicy({ scope, name: "F", document: foreign }),
		).toBeNull();

		const inScope: PolicyDocument = {
			version: "2026-01-01",
			statements: [
				{
					effect: "Allow",
					action: ["properties:Read"],
					resource: [`mr:org:*:${orgA}:*/*`],
				},
			],
		};
		expect(
			await adminCreatePolicy({ scope, name: "OK", document: inScope }),
		).not.toBeNull();
	});
});

describe("OrgManager cannot perform org administration (cutover regression)", () => {
	it("allows domain writes but denies member management, invites, org edits and iam", async () => {
		const orgId = oid();
		const manager = oid();
		const groups = await seedOrgSystemGroups(orgId);
		await addMembershipDB({
			payload: {
				groupId: groups!.manager._id.toString(),
				principalType: "user",
				principalId: manager,
				orgId,
			},
		});
		const auth = orgAuth(manager, orgId);

		expect(
			(
				await decide(
					auth,
					"properties:Update",
					arn.org.properties(orgId, oid()),
				)
			).decision,
		).toBe("allow");

		for (const action of [
			"organizations:Update",
			"organizations:InviteMember",
			"organizations:RemoveMember",
			"organizations:Delete",
			"iam:CreateGroup",
		] as const) {
			expect(
				(await decide(auth, action, arn.org.organizations(orgId)))
					.decision,
			).toBe("deny");
		}
	});
});

describe("system policy drift repair", () => {
	it("re-seeding repairs a stale system policy document to canonical", async () => {
		const orgId = oid();
		// Seed a WRONG document for OrgManager (admin's permissive doc) directly.
		await createIamPolicyDB({
			payload: {
				name: "OrgManager",
				plane: "org",
				orgId,
				managedBy: "system",
				document: orgAdminDocument(orgId),
			},
		});

		// Re-running the seed must reconcile it to the canonical manager doc.
		await seedOrgSystemGroups(orgId);
		const repaired = await findIamPolicyByNameDB({
			plane: "org",
			orgId,
			name: "OrgManager",
		});
		const denyStatement = repaired?.document.statements.find(
			(s) => s.effect === "Deny",
		);
		expect(denyStatement?.action).toContain("organizations:Update");
		expect(denyStatement?.action).toContain("organizations:InviteMember");
	});
});
