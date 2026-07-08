import mongoose from "mongoose";
import {
	afterAll,
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import { Redis } from "../../../src/server/databases";
import { principalArnForUser } from "../../../src/server/iam/arn";
import {
	addMembershipDB,
	createIamGroupDB,
	createIamPolicyDB,
} from "../../../src/server/iam/models";
import {
	bumpPolicyVersion,
	invalidatePrincipal,
	resolveEffectivePolicies,
} from "../../../src/server/iam/resolve";
import type { PolicyDocument } from "../../../src/server/iam/types";
import { clearTestDB, connectTestDB, dropTestDB } from "../../helpers/db";

const oid = () => new mongoose.Types.ObjectId().toString();

function docFor(orgId: string): PolicyDocument {
	return {
		version: "2026-01-01",
		statements: [
			{
				effect: "Allow",
				action: ["properties:Read"],
				resource: [`mr:org:*:${orgId}:*/*`],
			},
		],
	};
}

async function seedPrincipal(orgId: string, userId: string): Promise<string> {
	const policy = await createIamPolicyDB({
		payload: {
			name: "P",
			plane: "org",
			orgId,
			managedBy: "customer",
			document: docFor(orgId),
		},
	});
	const group = await createIamGroupDB({
		payload: {
			name: "G",
			plane: "org",
			orgId,
			managedBy: "customer",
			attachedPolicyIds: [policy!._id.toString()],
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
	return principalArnForUser(orgId, userId);
}

beforeAll(async () => {
	await connectTestDB();
});
beforeEach(async () => {
	await clearTestDB();
});
afterEach(() => {
	vi.restoreAllMocks();
});
afterAll(async () => {
	await dropTestDB();
});

describe("resolve fails closed when Redis is unavailable", () => {
	it("still resolves from the DB when the version read throws", async () => {
		const orgId = oid();
		const userId = oid();
		const principalArn = await seedPrincipal(orgId, userId);

		// Every Redis.get rejects → currentVersion() and readCache() both fall
		// into their catch blocks; resolution proceeds off the DB.
		vi.spyOn(Redis, "get").mockRejectedValue(new Error("redis down"));

		const resolved = await resolveEffectivePolicies(principalArn);
		expect(resolved).toHaveLength(1);
		expect(resolved[0]?.name).toBe("P");
	});

	it("still resolves when the cache write throws", async () => {
		const orgId = oid();
		const userId = oid();
		const principalArn = await seedPrincipal(orgId, userId);

		vi.spyOn(Redis, "setex").mockRejectedValue(new Error("redis down"));
		const resolved = await resolveEffectivePolicies(principalArn);
		expect(resolved).toHaveLength(1);
	});

	it("treats a corrupt / non-array cache entry as a miss", async () => {
		const orgId = oid();
		const userId = oid();
		const principalArn = await seedPrincipal(orgId, userId);

		// Poison the current-generation cache key with a non-array value.
		const version = (await Redis.get("iam:policyVersion")) ?? "0";
		await Redis.set(
			`iam:eff:${version}:${principalArn}`,
			JSON.stringify({ not: "an array" }),
		);

		const resolved = await resolveEffectivePolicies(principalArn);
		expect(resolved).toHaveLength(1); // fell back to the DB
	});

	it("bumpPolicyVersion and invalidatePrincipal swallow Redis errors", async () => {
		vi.spyOn(Redis, "incr").mockRejectedValue(new Error("redis down"));
		vi.spyOn(Redis, "del").mockRejectedValue(new Error("redis down"));
		vi.spyOn(Redis, "get").mockRejectedValue(new Error("redis down"));
		await expect(bumpPolicyVersion()).resolves.toBeUndefined();
		await expect(
			invalidatePrincipal(principalArnForUser(oid(), oid())),
		).resolves.toBeUndefined();
	});
});
