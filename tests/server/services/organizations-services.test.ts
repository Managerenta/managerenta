// Real integration tests for src/server/services/organizations/** against
// the per-worker scratch MongoDB and the local Redis instance.
//
// Mocked externals: only `uploadAndResizeImage` (sharp + S3). Invite
// notifications run for real — the default notification transport logs to
// stdout and persists the record in the scratch DB, no network involved.
import "./uniqueScratchDb"; // MUST stay the first import — see that file
import { randomBytes } from "node:crypto";
import mongoose from "mongoose";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { hashToken } from "../../../src/server/constants";
import {
	disconnectRedis,
	Redis,
	redisUpdateKeyString,
} from "../../../src/server/databases";
import { uploadAndResizeImage } from "../../../src/server/helpers";
import { Organization, User } from "../../../src/server/models";
import { IOrganizationRole } from "../../../src/server/models/organizations/types";
import { signup } from "../../../src/server/services/auth";
import {
	acceptInvite,
	createOrganization,
	deleteOrganization,
	getMyOrganizations,
	getOrganizationById,
	getOrganizationByName,
	getOrganizationMembers,
	getOrganizations,
	getOrganizationsByIds,
	getOrganizationsCount,
	inviteMember,
	removeOrganizationMembers,
	switchOrganization,
	updateOrganization,
	updateOrganizationMembers,
} from "../../../src/server/services/organizations";
import { getQueryKey as orgByIdKey } from "../../../src/server/services/organizations/getOrganizationById";
import { getQueryKey as orgsCountKey } from "../../../src/server/services/organizations/getOrganizationsCount";
import { getUserById } from "../../../src/server/services/users";
import { clearTestDB, connectTestDB, dropTestDB } from "../../helpers/db";

// External boundary: image resize + S3 upload — never hit AWS from tests.
vi.mock("../../../src/server/helpers", async (importOriginal) => {
	const actual =
		await importOriginal<typeof import("../../../src/server/helpers")>();
	return {
		...actual,
		uploadAndResizeImage: vi.fn(
			async ({ bufferOrUrl }: { bufferOrUrl?: Buffer | string }) =>
				bufferOrUrl ? "organizations/logo/mocked-logo.webp" : null,
		),
	};
});

function tag(): string {
	return randomBytes(6).toString("hex");
}

async function makeUser(emailPrefix = "member") {
	const t = tag();
	const payload = {
		username: `${emailPrefix}-${t}`,
		email: `${emailPrefix}-${t}@vitest.example.com`,
		password: "s3cret-password",
		name: `${emailPrefix} ${t}`,
	};
	const session = await signup({ payload: payload as never });
	if (!session) throw new Error("signup failed");
	return { ...payload, userId: session.userId };
}

async function makeOrg(ownerId: string, overrides: Record<string, unknown> = {}) {
	const doc = await createOrganization({
		payload: {
			ownerId: new mongoose.Types.ObjectId(ownerId),
			name: `org-${tag()}`,
			description: "A vitest organization",
			...overrides,
		} as never,
	});
	expect(doc).not.toBeNull();
	return doc;
}

beforeAll(async () => {
	await connectTestDB();
	await clearTestDB();
	// `User.init()` fails on MongoDB (schema mixes `sparse` and
	// `partialFilterExpression` on the passkey index) — build only the
	// unique indexes these tests depend on.
	await User.collection.createIndex({ email: 1 }, { unique: true });
	await User.collection.createIndex({ username: 1 }, { unique: true });
	// dupe-name behaviour depends on the unique index existing
	await Organization.collection.createIndex({ name: 1 }, { unique: true });
});

afterAll(async () => {
	await dropTestDB();
	await disconnectRedis();
});

describe("organizations/createOrganization", () => {
	it("creates the org with the owner seeded as an admin member", async () => {
		const owner = await makeUser("owner");
		const name = `Org-${tag()}`; // mixed case on purpose
		const doc = await createOrganization({
			payload: {
				ownerId: new mongoose.Types.ObjectId(owner.userId),
				name,
				description: "desc",
			} as never,
		});

		expect(doc.name).toBe(name.toLowerCase()); // schema lowercases
		expect(doc.ownerId.toString()).toBe(owner.userId);
		expect(doc.members).toHaveLength(1);
		expect(doc.members[0]?.memberId.toString()).toBe(owner.userId);
		expect(doc.members[0]?.permission).toBe(IOrganizationRole.ADMIN);
		expect(doc.invites).toEqual([]);
	});

	it("rejects a duplicate name (unique index, case-insensitive via lowercasing)", async () => {
		const owner = await makeUser("owner");
		const name = `org-${tag()}`;
		await makeOrg(owner.userId, { name });

		await expect(
			createOrganization({
				payload: {
					ownerId: new mongoose.Types.ObjectId(owner.userId),
					name: name.toUpperCase(),
					description: "dupe",
				} as never,
			}),
		).rejects.toThrow();

		expect(await Organization.countDocuments({ name })).toBe(1);
	});

	it("stores the uploaded logo from the (mocked) image pipeline", async () => {
		const owner = await makeUser("owner");
		const doc = await createOrganization({
			payload: {
				ownerId: new mongoose.Types.ObjectId(owner.userId),
				name: `org-${tag()}`,
				description: "with logo",
				logo: Buffer.from("fake-logo"),
			} as never,
		});
		expect(doc.logo).toBe("organizations/logo/mocked-logo.webp");
	});

	it("creates the org without a logo when the upload fails", async () => {
		const owner = await makeUser("owner");
		vi.mocked(uploadAndResizeImage).mockResolvedValueOnce(null);
		const doc = await createOrganization({
			payload: {
				ownerId: new mongoose.Types.ObjectId(owner.userId),
				name: `org-${tag()}`,
				description: "logo upload failed",
				logo: Buffer.from("broken"),
			} as never,
		});
		expect(doc.logo).toBeUndefined();
	});
});

describe("organizations/inviteMember", () => {
	it("records the invite with a HASHED token and a lowercased email", async () => {
		const owner = await makeUser("owner");
		const org = await makeOrg(owner.userId);

		const mixedCase = `Invitee-${tag()}@Example.COM`;
		const result = await inviteMember({
			organizationId: org._id.toString(),
			invitedById: owner.userId,
			email: mixedCase,
			role: IOrganizationRole.MANAGER,
		});

		expect(result).not.toBeNull();
		if (!result || "alreadyMember" in result) {
			throw new Error("expected a fresh invite");
		}
		expect(result.email).toBe(mixedCase.toLowerCase());
		expect(result.role).toBe(IOrganizationRole.MANAGER);
		expect(result.token).toMatch(/^[a-f0-9]{48}$/);
		expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());

		const doc = await Organization.findById(org._id).lean();
		expect(doc?.invites).toHaveLength(1);
		const invite = doc?.invites?.[0];
		expect(invite?.email).toBe(mixedCase.toLowerCase());
		// raw token must never be stored — only its sha256
		expect(invite?.token).not.toBe(result.token);
		expect(invite?.token).toBe(hashToken(result.token));
		expect(invite?.role).toBe(IOrganizationRole.MANAGER);
		expect(invite?.invitedById.toString()).toBe(owner.userId);
	});

	it("rejects inviting someone who is already a member", async () => {
		const owner = await makeUser("owner");
		const org = await makeOrg(owner.userId);

		const result = await inviteMember({
			organizationId: org._id.toString(),
			invitedById: owner.userId,
			email: owner.email.toUpperCase(), // owner is already a member
			role: IOrganizationRole.VIEWER,
		});
		expect(result).toEqual({ alreadyMember: true });

		const doc = await Organization.findById(org._id).lean();
		expect(doc?.invites).toHaveLength(0);
	});

	it("returns null for an unknown organization", async () => {
		const owner = await makeUser("owner");
		const result = await inviteMember({
			organizationId: new mongoose.Types.ObjectId().toString(),
			invitedById: owner.userId,
			email: "nobody@example.com",
			role: IOrganizationRole.VIEWER,
		});
		expect(result).toBeNull();
	});
});

describe("organizations/acceptInvite", () => {
	async function orgWithInvite(inviteeEmail: string) {
		const owner = await makeUser("owner");
		const org = await makeOrg(owner.userId);
		const invite = await inviteMember({
			organizationId: org._id.toString(),
			invitedById: owner.userId,
			email: inviteeEmail,
			role: IOrganizationRole.MANAGER,
		});
		if (!invite || "alreadyMember" in invite) {
			throw new Error("invite failed");
		}
		return { owner, org, invite };
	}

	it("joins when the accepting user's email matches the invited email (case-insensitive)", async () => {
		const invitee = await makeUser("invitee");
		// invite issued against a different casing of the same address
		const { org, invite } = await orgWithInvite(
			invitee.email.toUpperCase(),
		);

		const updated = await acceptInvite({
			token: invite.token,
			userId: invitee.userId,
		});
		expect(updated).not.toBeNull();
		expect(updated?._id.toString()).toBe(org._id.toString());

		const doc = await Organization.findById(org._id).lean();
		// member added at the invited role
		const member = doc?.members?.find(
			(m) => m.memberId.toString() === invitee.userId,
		);
		expect(member).toBeTruthy();
		expect(member?.permission).toBe(IOrganizationRole.MANAGER);
		// invite consumed
		expect(doc?.invites).toHaveLength(0);

		// the accepting user is switched into the org
		const user = await getUserById({
			id: invitee.userId,
			refreshCache: true,
		});
		expect(user?.currentOrganizationId).toBe(org._id.toString());
	});

	it("returns null and changes nothing when the email does NOT match (leaked link)", async () => {
		const invitee = await makeUser("invitee");
		const mallory = await makeUser("mallory");
		const { org, invite } = await orgWithInvite(invitee.email);

		const result = await acceptInvite({
			token: invite.token,
			userId: mallory.userId,
		});
		expect(result).toBeNull();

		const doc = await Organization.findById(org._id).lean();
		// invite NOT consumed, mallory NOT a member
		expect(doc?.invites).toHaveLength(1);
		expect(
			doc?.members?.some(
				(m) => m.memberId.toString() === mallory.userId,
			),
		).toBe(false);

		const user = await getUserById({
			id: mallory.userId,
			refreshCache: true,
		});
		expect(user?.currentOrganizationId).toBeUndefined();

		// the legitimate invitee can still accept afterwards
		const legit = await acceptInvite({
			token: invite.token,
			userId: invitee.userId,
		});
		expect(legit).not.toBeNull();
	});

	it("returns null for a bogus token", async () => {
		const invitee = await makeUser("invitee");
		const result = await acceptInvite({
			token: randomBytes(24).toString("hex"),
			userId: invitee.userId,
		});
		expect(result).toBeNull();
	});

	it("is single-use: a consumed token cannot be replayed", async () => {
		const invitee = await makeUser("invitee");
		const { invite } = await orgWithInvite(invitee.email);

		expect(
			await acceptInvite({ token: invite.token, userId: invitee.userId }),
		).not.toBeNull();
		expect(
			await acceptInvite({ token: invite.token, userId: invitee.userId }),
		).toBeNull();
	});

	it("rejects an expired invite", async () => {
		const invitee = await makeUser("invitee");
		const { org, invite } = await orgWithInvite(invitee.email);

		await Organization.updateOne(
			{ _id: org._id, "invites.token": hashToken(invite.token) },
			{ $set: { "invites.$.expiresAt": new Date(Date.now() - 1000) } },
		);

		const result = await acceptInvite({
			token: invite.token,
			userId: invitee.userId,
		});
		expect(result).toBeNull();

		const doc = await Organization.findById(org._id).lean();
		expect(
			doc?.members?.some(
				(m) => m.memberId.toString() === invitee.userId,
			),
		).toBe(false);
	});
});

describe("organizations/switchOrganization", () => {
	it("lets a member switch and persists currentOrganizationId", async () => {
		const owner = await makeUser("owner");
		const member = await makeUser("member");
		const org = await makeOrg(owner.userId);
		// add member directly (role management is covered elsewhere)
		await Organization.updateOne(
			{ _id: org._id },
			{
				$push: {
					members: {
						memberId: new mongoose.Types.ObjectId(member.userId),
						permission: IOrganizationRole.VIEWER,
					},
				},
			},
		);

		const result = await switchOrganization({
			userId: member.userId,
			organizationId: org._id.toString(),
		});
		expect(result).toEqual({ organizationId: org._id.toString() });

		const user = await getUserById({
			id: member.userId,
			refreshCache: true,
		});
		expect(user?.currentOrganizationId).toBe(org._id.toString());
	});

	it("lets the owner switch", async () => {
		const owner = await makeUser("owner");
		const org = await makeOrg(owner.userId);
		const result = await switchOrganization({
			userId: owner.userId,
			organizationId: org._id.toString(),
		});
		expect(result).toEqual({ organizationId: org._id.toString() });
	});

	it("rejects a non-member and leaves the user untouched", async () => {
		const owner = await makeUser("owner");
		const outsider = await makeUser("outsider");
		const org = await makeOrg(owner.userId);

		const result = await switchOrganization({
			userId: outsider.userId,
			organizationId: org._id.toString(),
		});
		expect(result).toBeNull();

		const user = await getUserById({
			id: outsider.userId,
			refreshCache: true,
		});
		expect(user?.currentOrganizationId).toBeUndefined();
	});

	it("rejects an unknown organization id", async () => {
		const user = await makeUser("user");
		expect(
			await switchOrganization({
				userId: user.userId,
				organizationId: new mongoose.Types.ObjectId().toString(),
			}),
		).toBeNull();
	});

	it("switching to personal (null) unsets currentOrganizationId", async () => {
		const owner = await makeUser("owner");
		const org = await makeOrg(owner.userId);
		await switchOrganization({
			userId: owner.userId,
			organizationId: org._id.toString(),
		});

		const result = await switchOrganization({
			userId: owner.userId,
			organizationId: null,
		});
		expect(result).toEqual({ organizationId: null });

		const user = await getUserById({
			id: owner.userId,
			refreshCache: true,
		});
		expect(user?.currentOrganizationId).toBeUndefined();
	});
});

describe("organizations/members management", () => {
	it("updateOrganizationMembers replaces the members array (role change)", async () => {
		const owner = await makeUser("owner");
		const member = await makeUser("member");
		const org = await makeOrg(owner.userId);

		const updated = await updateOrganizationMembers({
			organizationId: org._id.toString(),
			members: [
				{
					memberId: new mongoose.Types.ObjectId(owner.userId),
					permission: IOrganizationRole.ADMIN,
				},
				{
					memberId: new mongoose.Types.ObjectId(member.userId),
					permission: IOrganizationRole.MANAGER,
				},
			],
		});
		expect(updated).not.toBeNull();

		const doc = await Organization.findById(org._id).lean();
		expect(doc?.members).toHaveLength(2);
		expect(
			doc?.members?.find(
				(m) => m.memberId.toString() === member.userId,
			)?.permission,
		).toBe(IOrganizationRole.MANAGER);
	});

	// removeOrganizationMembersDB pulls the `{ memberId, permission }`
	// subdocument by its `memberId` field (matching `removeMemberDB`), so the
	// targeted member is removed while the owner's membership survives.
	it("removeOrganizationMembers removes the targeted member", async () => {
		const owner = await makeUser("owner");
		const member = await makeUser("member");
		const org = await makeOrg(owner.userId);
		await Organization.updateOne(
			{ _id: org._id },
			{
				$push: {
					members: {
						memberId: new mongoose.Types.ObjectId(member.userId),
						permission: IOrganizationRole.VIEWER,
					},
				},
			},
		);

		const result = await removeOrganizationMembers({
			organizationId: org._id.toString(),
			memberId: member.userId,
		});
		expect(result).not.toBeNull();

		const doc = await Organization.findById(org._id).lean();
		expect(
			doc?.members?.some(
				(m) => m.memberId.toString() === member.userId,
			),
		).toBe(false);
		// the owner's membership survives
		expect(
			doc?.members?.some(
				(m) => m.memberId.toString() === owner.userId,
			),
		).toBe(true);
	});

	it("getOrganizationMembers returns the member list", async () => {
		const owner = await makeUser("owner");
		const org = await makeOrg(owner.userId);
		const result = await getOrganizationMembers({
			organizationId: org._id.toString(),
			refreshCache: true,
		});
		expect(result?.members).toHaveLength(1);
		expect(result?.members?.[0]?.memberId.toString()).toBe(owner.userId);
	});
});

describe("organizations/getOrganizationById caching", () => {
	it("caches in Redis, serves stale until refreshed or invalidated", async () => {
		const owner = await makeUser("owner");
		const org = await makeOrg(owner.userId);
		const orgId = org._id.toString();

		const first = await getOrganizationById({ organizationId: orgId });
		expect(first?.name).toBe(org.name);
		expect(await Redis.exists(orgByIdKey({ organizationId: orgId }))).toBe(
			1,
		);

		// mutate behind the cache
		await Organization.updateOne(
			{ _id: org._id },
			{ $set: { description: "changed behind cache" } },
		);
		const cached = await getOrganizationById({ organizationId: orgId });
		expect(cached?.description).toBe("A vitest organization");

		const fresh = await getOrganizationById({
			organizationId: orgId,
			refreshCache: true,
		});
		expect(fresh?.description).toBe("changed behind cache");
	});

	it("updateOrganization invalidates the id cache", async () => {
		const owner = await makeUser("owner");
		const org = await makeOrg(owner.userId);
		const orgId = org._id.toString();
		await getOrganizationById({ organizationId: orgId }); // warm

		const updated = await updateOrganization({
			organizationId: orgId,
			payload: { description: "updated description" } as never,
		});
		expect(updated).not.toBeNull();

		expect(await Redis.exists(orgByIdKey({ organizationId: orgId }))).toBe(
			0,
		);
		const read = await getOrganizationById({ organizationId: orgId });
		expect(read?.description).toBe("updated description");
	});
});

describe("organizations/query services", () => {
	it("getOrganizationById returns null for an unknown id", async () => {
		expect(
			await getOrganizationById({
				organizationId: new mongoose.Types.ObjectId().toString(),
				refreshCache: true,
			}),
		).toBeNull();
	});

	it("getOrganizationByName finds by (case-insensitive) name and caches it", async () => {
		const owner = await makeUser("owner");
		const org = await makeOrg(owner.userId);

		const found = await getOrganizationByName({
			name: org.name.toUpperCase(),
			refreshCache: true,
		});
		expect(String(found?.id ?? (found as { _id?: unknown })?._id)).toBe(
			org._id.toString(),
		);

		// second call without refreshCache hits the cache (stale check)
		await Organization.updateOne(
			{ _id: org._id },
			{ $set: { description: "renamed desc" } },
		);
		const cached = await getOrganizationByName({
			name: org.name.toUpperCase(),
		});
		expect(cached?.description).toBe("A vitest organization");

		expect(
			await getOrganizationByName({
				name: `no-such-org-${tag()}`,
				refreshCache: true,
			}),
		).toBeNull();
	});

	it("getOrganizations filters by name and respects offset/limit + sort", async () => {
		const owner = await makeUser("owner");
		const stem = `list-${tag()}`;
		const orgA = await makeOrg(owner.userId, { name: `${stem}-a` });
		await new Promise((r) => setTimeout(r, 25)); // distinct createdAt
		const orgB = await makeOrg(owner.userId, { name: `${stem}-b` });

		const all = await getOrganizations({
			name: stem,
			offset: 0,
			limit: 10,
			refreshCache: true,
		});
		expect(all.map((o) => o.name).sort()).toEqual([
			orgA.name,
			orgB.name,
		]);

		const asc = await getOrganizations({
			name: stem,
			offset: 0,
			limit: 1,
			sortBy: "asc",
			refreshCache: true,
		});
		expect(asc).toHaveLength(1);
		expect(asc[0]?.name).toBe(orgA.name);

		const desc = await getOrganizations({
			name: stem,
			offset: 0,
			limit: 1,
			sortBy: "desc",
			refreshCache: true,
		});
		expect(desc[0]?.name).toBe(orgB.name);

		// cache hit path: same query again without refreshCache
		const cachedAgain = await getOrganizations({
			name: stem,
			offset: 0,
			limit: 10,
		});
		expect(cachedAgain.map((o) => o.name).sort()).toEqual([
			orgA.name,
			orgB.name,
		]);
	});

	it("getOrganizationsByIds returns exactly the requested orgs", async () => {
		const owner = await makeUser("owner");
		const orgA = await makeOrg(owner.userId);
		const orgB = await makeOrg(owner.userId);
		const orgC = await makeOrg(owner.userId); // not requested

		const result = await getOrganizationsByIds({
			ids: [orgA._id.toString(), orgB._id.toString()],
			offset: 0,
			limit: 10,
			refreshCache: true,
		});
		const ids = result.map((o) => String(o.id ?? (o as { _id?: unknown })._id)).sort();
		expect(ids).toEqual(
			[orgA._id.toString(), orgB._id.toString()].sort(),
		);
		expect(ids).not.toContain(orgC._id.toString());

		// same query again → served from cache
		const cached = await getOrganizationsByIds({
			ids: [orgA._id.toString(), orgB._id.toString()],
			offset: 0,
			limit: 10,
		});
		expect(cached.map((o) => String(o.id ?? (o as { _id?: unknown })._id)).sort()).toEqual(ids);

		// unknown ids → []
		expect(
			await getOrganizationsByIds({
				ids: [new mongoose.Types.ObjectId().toString()],
				offset: 0,
				limit: 10,
				refreshCache: true,
			}),
		).toEqual([]);
	});

	it("getOrganizationsCount counts non-deleted organizations", async () => {
		const owner = await makeUser("owner");
		const before = await getOrganizationsCount({ refreshCache: true });
		await makeOrg(owner.userId);
		const after = await getOrganizationsCount({ refreshCache: true });
		expect(after).toBe(before + 1);
	});

	it("getOrganizationsCount returns the cached number when present", async () => {
		// Seed the (global) cache key and read it back through the service.
		await redisUpdateKeyString(orgsCountKey(), 424242, true, 30);
		expect(await getOrganizationsCount()).toBe(424242);
		await Redis.del(orgsCountKey()); // don't leak the fake count
	});

	it("getOrganizationMembers serves the second call from cache and null for unknown org", async () => {
		const owner = await makeUser("owner");
		const other = await makeUser("other");
		const org = await makeOrg(owner.userId);

		const first = await getOrganizationMembers({
			organizationId: org._id.toString(),
		});
		expect(first?.members).toHaveLength(1);

		// add a member behind the cache — cached read must still say 1
		await Organization.updateOne(
			{ _id: org._id },
			{
				$push: {
					members: {
						memberId: new mongoose.Types.ObjectId(other.userId),
						permission: IOrganizationRole.VIEWER,
					},
				},
			},
		);
		const cached = await getOrganizationMembers({
			organizationId: org._id.toString(),
		});
		expect(cached?.members).toHaveLength(1);

		const fresh = await getOrganizationMembers({
			organizationId: org._id.toString(),
			refreshCache: true,
		});
		expect(fresh?.members).toHaveLength(2);

		expect(
			await getOrganizationMembers({
				organizationId: new mongoose.Types.ObjectId().toString(),
				refreshCache: true,
			}),
		).toBeNull();
	});
});

describe("organizations/mutations on unknown orgs return null", () => {
	const ghostId = () => new mongoose.Types.ObjectId().toString();

	it("updateOrganization", async () => {
		expect(
			await updateOrganization({
				organizationId: ghostId(),
				payload: { description: "nope" } as never,
			}),
		).toBeNull();
	});

	it("updateOrganizationMembers", async () => {
		expect(
			await updateOrganizationMembers({
				organizationId: ghostId(),
				members: [],
			}),
		).toBeNull();
	});

	it("removeOrganizationMembers", async () => {
		expect(
			await removeOrganizationMembers({
				organizationId: ghostId(),
				memberId: ghostId(),
			}),
		).toBeNull();
	});

	it("deleteOrganization", async () => {
		expect(
			await deleteOrganization({ organizationId: ghostId() }),
		).toBeNull();
	});
});

describe("organizations/getMyOrganizations", () => {
	it("returns orgs where the user is owner or member — and nothing else", async () => {
		const owner = await makeUser("owner");
		const member = await makeUser("member");
		const outsider = await makeUser("outsider");
		const orgA = await makeOrg(owner.userId);
		const orgB = await makeOrg(member.userId);
		await Organization.updateOne(
			{ _id: orgA._id },
			{
				$push: {
					members: {
						memberId: new mongoose.Types.ObjectId(member.userId),
						permission: IOrganizationRole.VIEWER,
					},
				},
			},
		);

		const mine = await getMyOrganizations({ userId: member.userId });
		const ids = mine.map((o) => String(o.id ?? (o as { _id?: unknown })._id));
		expect(ids).toContain(orgA._id.toString());
		expect(ids).toContain(orgB._id.toString());

		const theirs = await getMyOrganizations({ userId: outsider.userId });
		expect(theirs).toHaveLength(0);
	});
});

describe("organizations/deleteOrganization", () => {
	it("soft-deletes and hides the org from reads", async () => {
		const owner = await makeUser("owner");
		const org = await makeOrg(owner.userId);
		const orgId = org._id.toString();

		const result = await deleteOrganization({ organizationId: orgId });
		expect(result).not.toBeNull();

		const read = await getOrganizationById({
			organizationId: orgId,
			refreshCache: true,
		});
		expect(read).toBeNull();

		// row still present (soft delete)
		const raw = await Organization.findById(org._id)
			.select("+deleted")
			.lean();
		expect(raw).not.toBeNull();
		expect(raw?.deleted).toBe(true);
	});
});
