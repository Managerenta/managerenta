import mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { ErrForbidden } from "../../../src/server/constants";
import { arn } from "../../../src/server/iam/arn";
import {
	authorize,
	buildContext,
	decide,
} from "../../../src/server/iam/authorize";
import {
	addMembershipDB,
	createIamGroupDB,
	createIamOperatorDB,
	findIamGroupByNameDB,
	setIamOperatorStatusDB,
} from "../../../src/server/iam/models";
import {
	seedOrgSystemGroups,
	seedPlatformSystemPolicies,
} from "../../../src/server/iam/seed/system-policies";
import type { AuthResult } from "../../../src/server/lib/auth";
import { AuditEvent } from "../../../src/server/models/audit";
import { clearTestDB, connectTestDB, dropTestDB } from "../../helpers/db";

const oid = () => new mongoose.Types.ObjectId().toString();

function makeAuth(overrides: Partial<AuthResult> = {}): AuthResult {
	const userId = overrides.userId ?? oid();
	return {
		userId,
		token: { userId, ip: "1.1.1.1" } as unknown as AuthResult["token"],
		refreshed: false,
		effectiveOwnerId: overrides.effectiveOwnerId ?? userId,
		organizationId: overrides.organizationId ?? null,
		role: overrides.role ?? null,
	};
}

// Redis is shared across vitest workers; do not clear the global `iam:*`
// namespace (it would race other workers). Fresh ObjectIds per test keep every
// principal's cache key unique.

beforeAll(async () => {
	await connectTestDB();
});
beforeEach(async () => {
	await clearTestDB();
});
afterAll(async () => {
	await dropTestDB();
});

describe("personal scope (no organization)", () => {
	it("grants the user full control of resources under their own id", async () => {
		const auth = makeAuth();
		await expect(
			authorize(
				auth,
				"properties:Update",
				arn.org.properties(auth.userId, oid()),
			),
		).resolves.toBeUndefined();
		const d = await decide(
			auth,
			"tenants:Delete",
			arn.org.tenants(auth.userId, oid()),
		);
		expect(d.decision).toBe("allow");
	});

	it("denies access to another user's resources and to the platform plane", async () => {
		const auth = makeAuth();
		const other = await decide(
			auth,
			"properties:Read",
			arn.org.properties(oid(), oid()),
		);
		expect(other.decision).toBe("deny");
		await expect(
			authorize(auth, "organizations:List", arn.platform.organizations()),
		).rejects.toBe(ErrForbidden);
	});
});

describe("org plane via seeded groups", () => {
	it("OrgViewer can read/list but not write", async () => {
		const orgId = oid();
		const ownerId = oid();
		const userId = oid();
		const groups = await seedOrgSystemGroups(orgId);
		await addMembershipDB({
			payload: {
				groupId: groups!.viewer._id.toString(),
				principalType: "user",
				principalId: userId,
				orgId,
			},
		});
		const auth = makeAuth({
			userId,
			organizationId: orgId,
			effectiveOwnerId: ownerId,
		});

		expect(
			(await decide(auth, "properties:List", arn.org.properties(orgId)))
				.decision,
		).toBe("allow");
		expect(
			(
				await decide(
					auth,
					"properties:Read",
					arn.org.properties(orgId, oid()),
				)
			).decision,
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

	it("OrgManager can write but is denied iam:* and member removal (explicit deny wins)", async () => {
		const orgId = oid();
		const userId = oid();
		const groups = await seedOrgSystemGroups(orgId);
		await addMembershipDB({
			payload: {
				groupId: groups!.manager._id.toString(),
				principalType: "user",
				principalId: userId,
				orgId,
			},
		});
		const auth = makeAuth({ userId, organizationId: orgId });

		expect(
			(
				await decide(
					auth,
					"properties:Update",
					arn.org.properties(orgId, oid()),
				)
			).decision,
		).toBe("allow");
		expect(
			(await decide(auth, "iam:CreateGroup", arn.org.iam(orgId)))
				.decision,
		).toBe("deny");
		expect(
			(
				await decide(
					auth,
					"organizations:RemoveMember",
					arn.org.organizations(orgId),
				)
			).decision,
		).toBe("deny");
	});

	it("OrgAdmin can do everything within the org", async () => {
		const orgId = oid();
		const userId = oid();
		const groups = await seedOrgSystemGroups(orgId);
		await addMembershipDB({
			payload: {
				groupId: groups!.admin._id.toString(),
				principalType: "user",
				principalId: userId,
				orgId,
			},
		});
		const auth = makeAuth({ userId, organizationId: orgId });
		for (const action of [
			"properties:Delete",
			"iam:CreateGroup",
			"organizations:RemoveMember",
		] as const) {
			expect(
				(await decide(auth, action, arn.org.iam(orgId))).decision,
			).toBe("allow");
		}
	});

	it("a member of the org but in no group is denied (default-deny)", async () => {
		const orgId = oid();
		const auth = makeAuth({ userId: oid(), organizationId: orgId });
		expect(
			(
				await decide(
					auth,
					"properties:Read",
					arn.org.properties(orgId, oid()),
				)
			).decision,
		).toBe("deny");
	});
});

describe("platform operators", () => {
	it("an active operator in platform-admins is allowed; disabled and non-operators are denied", async () => {
		await seedPlatformSystemPolicies();
		const adminGroup = await findIamGroupByNameDB({
			plane: "platform",
			orgId: null,
			name: "platform-admins",
		});
		const userId = oid();
		await createIamOperatorDB({ payload: { userId } });
		await addMembershipDB({
			payload: {
				groupId: adminGroup!._id.toString(),
				principalType: "operator",
				principalId: userId,
				orgId: null,
			},
		});
		const auth = makeAuth({ userId });

		expect(
			(
				await decide(
					auth,
					"organizations:Suspend",
					arn.platform.organizations(oid()),
				)
			).decision,
		).toBe("allow");

		// Disable the operator → denied before any policy lookup (status is read
		// fresh from the DB, so no cache invalidation is needed).
		await setIamOperatorStatusDB({ userId, status: "disabled" });
		expect(
			(
				await decide(
					auth,
					"organizations:List",
					arn.platform.organizations(),
				)
			).decision,
		).toBe("deny");

		// A user who is not an operator at all is denied.
		const stranger = makeAuth();
		expect(
			(
				await decide(
					stranger,
					"organizations:List",
					arn.platform.organizations(),
				)
			).decision,
		).toBe("deny");
	});
});

describe("authorize() side effects", () => {
	it("throws ErrForbidden and writes an authz-deny audit event on denial", async () => {
		const auth = makeAuth({ effectiveOwnerId: oid() });
		await expect(
			authorize(auth, "organizations:List", arn.platform.organizations()),
		).rejects.toBe(ErrForbidden);

		const event = await AuditEvent.findOne({ action: "authz-deny" }).lean();
		expect(event).not.toBeNull();
		expect(event?.ownerId).toBe(auth.effectiveOwnerId);
		expect((event?.metadata as { action?: string })?.action).toBe(
			"organizations:List",
		);
	});

	it("records the request IP in the denial audit event", async () => {
		const auth = makeAuth({ effectiveOwnerId: oid() });
		const req = new Request("http://localhost/api/x", {
			headers: { "x-real-ip": "7.7.7.7" },
		});
		await expect(
			authorize(
				auth,
				"organizations:List",
				arn.platform.organizations(),
				{
					req,
				},
			),
		).rejects.toBe(ErrForbidden);
		const event = await AuditEvent.findOne({ action: "authz-deny" })
			.sort({ createdAt: -1 })
			.lean();
		expect(event?.ip).toBe("7.7.7.7");
	});

	it("denies a malformed resource ARN", async () => {
		const auth = makeAuth();
		const d = await decide(auth, "properties:Read", "not-an-arn");
		expect(d.decision).toBe("deny");
		expect(d.reason).toMatch(/malformed/);
	});
});

describe("buildContext", () => {
	it("reads mfa from the token, ip/resourceOwner from overrides and the resource", () => {
		const auth = makeAuth({ organizationId: "652" });
		(auth.token as unknown as { mfaPresent: boolean }).mfaPresent = true;
		const ctx = buildContext(auth, "652", { sourceIp: "9.9.9.9" });
		expect(ctx.mfaPresent).toBe(true);
		expect(ctx.sourceIp).toBe("9.9.9.9");
		expect(ctx.orgId).toBe("652");
		expect(ctx.resourceOwner).toBe("652");
		expect(ctx.currentTime).toBeInstanceOf(Date);

		// Wildcard resource orgId does not become a resourceOwner.
		expect(buildContext(auth, "*", {}).resourceOwner).toBeUndefined();
		// Explicit override wins.
		expect(
			buildContext(auth, "652", { resourceOwner: "owner-x" })
				.resourceOwner,
		).toBe("owner-x");
	});
});
