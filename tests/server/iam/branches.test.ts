import mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildContext } from "../../../src/server/iam/authorize";
import {
	conditionMatches,
	resourceMatches,
} from "../../../src/server/iam/engine";
import {
	addMembershipDB,
	createIamGroupDB,
	findIamGroupByNameDB,
} from "../../../src/server/iam/models";
import type { AuthResult } from "../../../src/server/lib/auth";
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

describe("engine edge branches", () => {
	it("rejects a concrete non-matching id segment (no wildcard)", () => {
		expect(
			resourceMatches(
				"mr:org:properties:652:property/000",
				"mr:org:properties:652:property/908",
			),
		).toBe(false);
	});

	it("evaluates the mr:ResourceOwner condition key", () => {
		const ctx = { currentTime: new Date(), resourceOwner: "owner-1" };
		expect(
			conditionMatches(
				{ StringEquals: { "mr:ResourceOwner": ["owner-1"] } },
				ctx,
			),
		).toBe(true);
		expect(
			conditionMatches(
				{ StringEquals: { "mr:ResourceOwner": ["owner-2"] } },
				ctx,
			),
		).toBe(false);
		// Missing resourceOwner fails closed.
		expect(
			conditionMatches(
				{ StringEquals: { "mr:ResourceOwner": ["owner-1"] } },
				{ currentTime: new Date() },
			),
		).toBe(false);
	});
});

describe("model input-shape branches", () => {
	it("accepts ObjectId instances (not just strings) for ids", async () => {
		const membership = await addMembershipDB({
			payload: {
				groupId: oid(),
				principalType: "user",
				principalId: oid(),
				orgId: oid(),
			},
		});
		expect(membership).not.toBeNull();
	});

	it("createIamGroupDB fails soft on an unparseable attached policy id", async () => {
		const g = await createIamGroupDB({
			payload: {
				name: "X",
				plane: "org",
				orgId: oid().toString(),
				managedBy: "system",
				attachedPolicyIds: ["not-an-oid"],
			},
		});
		expect(g).toBeNull();
	});

	it("findIamGroupByNameDB fails soft on an unparseable orgId", async () => {
		expect(
			await findIamGroupByNameDB({
				plane: "org",
				orgId: "not-an-oid",
				name: "x",
			}),
		).toBeNull();
	});
});

describe("buildContext derives ip from the request", () => {
	it("reads sourceIp via getClientIp when a request is supplied", () => {
		const auth: AuthResult = {
			userId: oid().toString(),
			token: {} as unknown as AuthResult["token"],
			refreshed: false,
			effectiveOwnerId: oid().toString(),
			organizationId: null,
			role: null,
		};
		const req = new Request("http://localhost/api/x", {
			headers: { "x-real-ip": "5.5.5.5" },
		});
		const ctx = buildContext(auth, oid().toString(), { req });
		expect(ctx.sourceIp).toBe("5.5.5.5");
	});
});
