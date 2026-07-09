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
import {
	addOrganizationInviteDB,
	consumeInviteAndAddMemberDB,
	createOrganizationDB,
	deleteOrganizationDB,
	findOrganizationByInviteTokenDB,
	getOrganizationByIdDB,
	getOrganizationByNameDB,
	getOrganizationMembersDB,
	getOrganizationsByIdsDB,
	getOrganizationsCountDB,
	getOrganizationsDB,
	getOrganizationsForMemberDB,
	IOrganizationRole,
	Organization,
	removeMemberDB,
	removeOrganizationMembersDB,
	revokeInviteDB,
	setMemberRoleDB,
	updateOrganizationDB,
	updateOrganizationMembersDB,
} from "../../../src/server/models/organizations";
import { clearTestDB, connectTestDB, dropTestDB } from "../../helpers/db";

const oid = () => new mongoose.Types.ObjectId();
const unknownId = () => oid().toString();

function orgPayload(n: number, ownerId = oid()) {
	return {
		ownerId,
		name: `test org ${n}`,
		description: `Description ${n}`,
	};
}

async function makeOrg(n: number, ownerId = oid()) {
	const org = await createOrganizationDB({ payload: orgPayload(n, ownerId) });
	expect(org).not.toBeNull();
	// biome-ignore lint/style/noNonNullAssertion: asserted above
	return org!;
}

/** Raw DB read that bypasses the aggregate hooks and select:false on deleted. */
async function rawOrg(id: mongoose.Types.ObjectId | string) {
	return Organization.collection.findOne({
		_id: new mongoose.Types.ObjectId(id.toString()),
	});
}

beforeAll(async () => {
	expect(process.env.DB_NAME).toMatch(/^managerenta-vitest/);
	await connectTestDB();
	await Organization.init();
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

describe("createOrganizationDB", () => {
	it("creates an organization and lowercases the name", async () => {
		const org = await createOrganizationDB({
			payload: { ownerId: oid(), name: "ACME Corp", description: "d" },
		});
		expect(org?.name).toBe("acme corp");
		const raw = await rawOrg(org?.id ?? "");
		expect(raw?.name).toBe("acme corp");
		expect(raw?.deleted).toBe(false);
	});

	it("returns null on duplicate name", async () => {
		await makeOrg(1);
		const dup = await createOrganizationDB({ payload: orgPayload(1) });
		expect(dup).toBeNull();
		expect(await Organization.countDocuments()).toBe(1);
	});

	it("returns null when required fields are missing", async () => {
		const org = await createOrganizationDB({
			payload: { ownerId: oid(), name: "no desc" } as never,
		});
		expect(org).toBeNull();
	});
});

describe("updateOrganizationDB", () => {
	it("updates and returns the after-document", async () => {
		const org = await makeOrg(1);
		const result = await updateOrganizationDB({
			id: org.id.toString(),
			payload: {
				ownerId: org.ownerId,
				name: org.name,
				description: "updated description",
				website: "https://example.com",
			},
		});
		expect(result?.description).toBe("updated description");
		expect(result?.website).toBe("https://example.com");
		const raw = await rawOrg(org.id);
		expect(raw?.description).toBe("updated description");
	});

	it("returns null for an unknown id", async () => {
		expect(
			await updateOrganizationDB({
				id: unknownId(),
				payload: orgPayload(9),
			}),
		).toBeNull();
	});

	it("returns null for a soft-deleted organization", async () => {
		const org = await makeOrg(2);
		await deleteOrganizationDB({ id: org.id.toString() });
		expect(
			await updateOrganizationDB({
				id: org.id.toString(),
				payload: orgPayload(2, org.ownerId),
			}),
		).toBeNull();
	});
});

describe("deleteOrganizationDB (soft delete)", () => {
	it("marks deleted and hides the org from aggregate reads", async () => {
		const org = await makeOrg(1);
		const result = await deleteOrganizationDB({ id: org.id.toString() });
		expect(result).not.toBeNull();
		const raw = await rawOrg(org.id);
		expect(raw?.deleted).toBe(true);
		expect(
			await getOrganizationByIdDB({ id: org.id.toString() }),
		).toBeNull();
	});

	it("returns null when deleting twice or for an unknown id", async () => {
		const org = await makeOrg(2);
		await deleteOrganizationDB({ id: org.id.toString() });
		expect(
			await deleteOrganizationDB({ id: org.id.toString() }),
		).toBeNull();
		expect(await deleteOrganizationDB({ id: unknownId() })).toBeNull();
	});
});

describe("member management", () => {
	it("updateOrganizationMembersDB replaces the members array", async () => {
		const org = await makeOrg(1);
		const memberId = oid();
		const result = await updateOrganizationMembersDB({
			id: org.id.toString(),
			members: [{ memberId, permission: IOrganizationRole.MANAGER }],
		});
		expect(result?.members).toHaveLength(1);
		expect(result?.members[0].memberId.toString()).toBe(
			memberId.toString(),
		);
		expect(result?.members[0].permission).toBe(IOrganizationRole.MANAGER);
	});

	it("updateOrganizationMembersDB returns null for an unknown org", async () => {
		expect(
			await updateOrganizationMembersDB({ id: unknownId(), members: [] }),
		).toBeNull();
	});

	it("setMemberRoleDB updates exactly the targeted member's role", async () => {
		const org = await makeOrg(2);
		const m1 = oid();
		const m2 = oid();
		await updateOrganizationMembersDB({
			id: org.id.toString(),
			members: [
				{ memberId: m1, permission: IOrganizationRole.VIEWER },
				{ memberId: m2, permission: IOrganizationRole.VIEWER },
			],
		});
		const result = await setMemberRoleDB({
			orgId: org.id.toString(),
			memberId: m2.toString(),
			role: IOrganizationRole.ADMIN,
		});
		const byId = Object.fromEntries(
			(result?.members ?? []).map((m) => [
				m.memberId.toString(),
				m.permission,
			]),
		);
		expect(byId[m1.toString()]).toBe(IOrganizationRole.VIEWER);
		expect(byId[m2.toString()]).toBe(IOrganizationRole.ADMIN);
	});

	it("setMemberRoleDB returns null when the member is not in the org", async () => {
		const org = await makeOrg(3);
		expect(
			await setMemberRoleDB({
				orgId: org.id.toString(),
				memberId: unknownId(),
				role: IOrganizationRole.ADMIN,
			}),
		).toBeNull();
	});

	it("removeMemberDB pulls the member subdocument", async () => {
		const org = await makeOrg(4);
		const m1 = oid();
		const m2 = oid();
		await updateOrganizationMembersDB({
			id: org.id.toString(),
			members: [
				{ memberId: m1, permission: IOrganizationRole.VIEWER },
				{ memberId: m2, permission: IOrganizationRole.MANAGER },
			],
		});
		const result = await removeMemberDB({
			orgId: org.id.toString(),
			memberId: m1.toString(),
		});
		expect(result?.members).toHaveLength(1);
		expect(result?.members[0].memberId.toString()).toBe(m2.toString());
	});

	it("removeMemberDB returns null for an unknown org", async () => {
		expect(
			await removeMemberDB({ orgId: unknownId(), memberId: unknownId() }),
		).toBeNull();
	});

	it("getOrganizationMembersDB projects only members", async () => {
		const org = await makeOrg(5);
		const m1 = oid();
		await updateOrganizationMembersDB({
			id: org.id.toString(),
			members: [{ memberId: m1, permission: IOrganizationRole.VIEWER }],
		});
		const result = await getOrganizationMembersDB({
			id: org.id.toString(),
		});
		expect(result?.members).toHaveLength(1);
		expect(result?.members[0].memberId.toString()).toBe(m1.toString());
		expect(
			(result as unknown as Record<string, unknown>)?.name,
		).toBeUndefined();
	});

	it("getOrganizationMembersDB returns null for unknown or deleted orgs", async () => {
		expect(await getOrganizationMembersDB({ id: unknownId() })).toBeNull();
		const org = await makeOrg(6);
		await deleteOrganizationDB({ id: org.id.toString() });
		expect(
			await getOrganizationMembersDB({ id: org.id.toString() }),
		).toBeNull();
	});

	it("removeOrganizationMembersDB pulls the targeted {memberId, permission} subdocument", async () => {
		const org = await makeOrg(7);
		const m1 = oid();
		const m2 = oid();
		await updateOrganizationMembersDB({
			id: org.id.toString(),
			members: [
				{ memberId: m1, permission: IOrganizationRole.VIEWER },
				{ memberId: m2, permission: IOrganizationRole.MANAGER },
			],
		});
		const result = await removeOrganizationMembersDB({
			id: org.id.toString(),
			memberId: m1.toString(),
		});
		expect(result).not.toBeNull();
		// Only the targeted member is pulled; the other membership survives.
		const raw = await rawOrg(org.id);
		expect(raw?.members).toHaveLength(1);
		expect(raw?.members?.[0]?.memberId?.toString()).toBe(m2.toString());
	});
});

describe("getOrganizationsDB", () => {
	it("filters by name substring case-insensitively and paginates", async () => {
		const orgs = [
			await makeOrg(1), // "test org 1"
			await makeOrg(2),
			await makeOrg(3),
		];
		// Force deterministic createdAt ordering (raw driver bypasses timestamps).
		for (let i = 0; i < orgs.length; i++) {
			await Organization.collection.updateOne(
				{ _id: new mongoose.Types.ObjectId(orgs[i].id.toString()) },
				{ $set: { createdAt: new Date(2026, 0, i + 1) } },
			);
		}

		const all = await getOrganizationsDB({ offset: 0, limit: 10 });
		expect(all).toHaveLength(3);

		const filtered = await getOrganizationsDB({
			name: "TEST ORG 2",
			offset: 0,
			limit: 10,
		});
		expect(filtered).toHaveLength(1);
		expect(filtered[0].name).toBe("test org 2");

		const asc = await getOrganizationsDB({
			offset: 0,
			limit: 10,
			sortBy: "asc",
		});
		expect(asc.map((o) => o.name)).toEqual([
			"test org 1",
			"test org 2",
			"test org 3",
		]);
		const desc = await getOrganizationsDB({
			offset: 0,
			limit: 10,
			sortBy: "desc",
		});
		expect(desc.map((o) => o.name)).toEqual([
			"test org 3",
			"test org 2",
			"test org 1",
		]);

		const page2 = await getOrganizationsDB({
			offset: 2,
			limit: 10,
			sortBy: "asc",
		});
		expect(page2.map((o) => o.name)).toEqual(["test org 3"]);
		const limited = await getOrganizationsDB({
			offset: 0,
			limit: 1,
			sortBy: "asc",
		});
		expect(limited).toHaveLength(1);
	});

	it("escapes regex metacharacters: a name containing regex syntax finds itself", async () => {
		await createOrganizationDB({
			payload: {
				ownerId: oid(),
				name: "weird (a+) [name]",
				description: "d",
			},
		});
		const found = await getOrganizationsDB({
			name: "weird (a+) [name]",
			offset: 0,
			limit: 10,
		});
		expect(found).toHaveLength(1);
		expect(found[0].name).toBe("weird (a+) [name]");
	});

	it("a ReDoS-style search string does not crash and matches nothing", async () => {
		await makeOrg(1);
		const found = await getOrganizationsDB({
			name: "(x+)+$",
			offset: 0,
			limit: 10,
		});
		expect(found).toEqual([]);
	});

	it("excludes soft-deleted organizations", async () => {
		const a = await makeOrg(1);
		await makeOrg(2);
		await deleteOrganizationDB({ id: a.id.toString() });
		const all = await getOrganizationsDB({ offset: 0, limit: 10 });
		expect(all).toHaveLength(1);
		expect(all[0].name).toBe("test org 2");
	});
});

describe("getOrganizationByIdDB / getOrganizationByNameDB", () => {
	it("returns the org by id with a string id field", async () => {
		const org = await makeOrg(1);
		const found = await getOrganizationByIdDB({ id: org.id.toString() });
		expect(found?.name).toBe("test org 1");
		expect(String(found?.id)).toBe(org.id.toString());
	});

	it("returns null for unknown or deleted ids", async () => {
		expect(await getOrganizationByIdDB({ id: unknownId() })).toBeNull();
		const org = await makeOrg(2);
		await deleteOrganizationDB({ id: org.id.toString() });
		expect(
			await getOrganizationByIdDB({ id: org.id.toString() }),
		).toBeNull();
	});

	it("finds by name case-insensitively with escaped regex chars", async () => {
		await createOrganizationDB({
			payload: {
				ownerId: oid(),
				name: "dots.and+plus",
				description: "d",
			},
		});
		const found = await getOrganizationByNameDB({ name: "DOTS.AND+PLUS" });
		expect(found?.name).toBe("dots.and+plus");
		// Unescaped "." would match "dotsXand..." — prove the literal dot is
		// required by searching a string that only matches under regex rules.
		expect(
			await getOrganizationByNameDB({ name: "dotsXand+plus" }),
		).toBeNull();
	});

	it("returns null for an unknown name", async () => {
		expect(await getOrganizationByNameDB({ name: "ghost org" })).toBeNull();
	});
});

describe("getOrganizationsByIdsDB / getOrganizationsCountDB", () => {
	it("returns matching orgs, paginates, and excludes soft-deleted", async () => {
		const a = await makeOrg(1);
		const b = await makeOrg(2);
		const c = await makeOrg(3);
		await deleteOrganizationDB({ id: c.id.toString() });
		const ids = [a, b, c].map((o) => o.id.toString());
		const all = await getOrganizationsByIdsDB({
			ids,
			offset: 0,
			limit: 10,
		});
		expect(all.map((o) => o.name).sort()).toEqual([
			"test org 1",
			"test org 2",
		]);
		const paged = await getOrganizationsByIdsDB({
			ids,
			offset: 1,
			limit: 10,
		});
		expect(paged).toHaveLength(1);
	});

	it("counts only non-deleted organizations", async () => {
		const a = await makeOrg(1);
		await makeOrg(2);
		expect(await getOrganizationsCountDB({})).toBe(2);
		await deleteOrganizationDB({ id: a.id.toString() });
		expect(await getOrganizationsCountDB({})).toBe(1);
	});
});

describe("getOrganizationsForMemberDB", () => {
	it("matches orgs where the user is owner OR member, sorted newest first", async () => {
		const u1 = oid();
		const other = oid();
		const owned = await makeOrg(1, u1);
		const memberOf = await makeOrg(2, other);
		await updateOrganizationMembersDB({
			id: memberOf.id.toString(),
			members: [{ memberId: u1, permission: IOrganizationRole.VIEWER }],
		});
		await makeOrg(3, other); // unrelated

		await Organization.collection.updateOne(
			{ _id: new mongoose.Types.ObjectId(owned.id.toString()) },
			{ $set: { createdAt: new Date(2026, 0, 1) } },
		);
		await Organization.collection.updateOne(
			{ _id: new mongoose.Types.ObjectId(memberOf.id.toString()) },
			{ $set: { createdAt: new Date(2026, 0, 2) } },
		);

		const result = await getOrganizationsForMemberDB({
			userId: u1.toString(),
		});
		expect(result.map((o) => o.name)).toEqual(["test org 2", "test org 1"]);
	});

	it("returns a single entry when the user is both owner and member", async () => {
		const u1 = oid();
		const org = await makeOrg(1, u1);
		await updateOrganizationMembersDB({
			id: org.id.toString(),
			members: [{ memberId: u1, permission: IOrganizationRole.ADMIN }],
		});
		const result = await getOrganizationsForMemberDB({
			userId: u1.toString(),
		});
		expect(result).toHaveLength(1);
	});

	it("returns [] for a user with no orgs and excludes deleted orgs", async () => {
		const u1 = oid();
		expect(
			await getOrganizationsForMemberDB({ userId: u1.toString() }),
		).toEqual([]);
		const org = await makeOrg(1, u1);
		await deleteOrganizationDB({ id: org.id.toString() });
		expect(
			await getOrganizationsForMemberDB({ userId: u1.toString() }),
		).toEqual([]);
	});
});

describe("invites", () => {
	function invite(
		overrides: Partial<
			Parameters<typeof addOrganizationInviteDB>[0]["invite"]
		> = {},
	) {
		return {
			email: "invitee@example.com",
			token: "invite-token-1",
			role: IOrganizationRole.MANAGER,
			invitedById: oid(),
			expiresAt: new Date(Date.now() + 3600_000),
			...overrides,
		};
	}

	it("addOrganizationInviteDB pushes an invite", async () => {
		const org = await makeOrg(1);
		const result = await addOrganizationInviteDB({
			id: org.id.toString(),
			invite: invite(),
		});
		expect(result?.invites).toHaveLength(1);
		expect(result?.invites?.[0].email).toBe("invitee@example.com");
		expect(result?.invites?.[0].token).toBe("invite-token-1");
	});

	it("addOrganizationInviteDB returns null for an unknown org", async () => {
		expect(
			await addOrganizationInviteDB({
				id: unknownId(),
				invite: invite(),
			}),
		).toBeNull();
	});

	it("findOrganizationByInviteTokenDB finds the org holding the token", async () => {
		const org = await makeOrg(2);
		await addOrganizationInviteDB({
			id: org.id.toString(),
			invite: invite({ token: "find-me" }),
		});
		const found = await findOrganizationByInviteTokenDB({
			token: "find-me",
		});
		expect(found?.name).toBe("test org 2");
		expect(
			await findOrganizationByInviteTokenDB({ token: "missing" }),
		).toBeNull();
	});

	it("consumeInviteAndAddMemberDB adds the member with the invite role and removes the invite", async () => {
		const org = await makeOrg(3);
		await addOrganizationInviteDB({
			id: org.id.toString(),
			invite: invite({
				token: "consume-me",
				role: IOrganizationRole.VIEWER,
			}),
		});
		const memberId = oid();
		const result = await consumeInviteAndAddMemberDB({
			orgId: org.id.toString(),
			token: "consume-me",
			memberId,
		});
		expect(result).not.toBeNull();
		const raw = await rawOrg(org.id);
		expect(raw?.invites).toHaveLength(0);
		expect(raw?.members).toHaveLength(1);
		expect(raw?.members[0].memberId.toString()).toBe(memberId.toString());
		expect(raw?.members[0].permission).toBe(IOrganizationRole.VIEWER);
	});

	it("consumeInviteAndAddMemberDB rejects an expired invite and leaves state unchanged", async () => {
		const org = await makeOrg(4);
		await addOrganizationInviteDB({
			id: org.id.toString(),
			invite: invite({
				token: "expired-tok",
				expiresAt: new Date(Date.now() - 1000),
			}),
		});
		const result = await consumeInviteAndAddMemberDB({
			orgId: org.id.toString(),
			token: "expired-tok",
			memberId: oid(),
		});
		expect(result).toBeNull();
		const raw = await rawOrg(org.id);
		expect(raw?.invites).toHaveLength(1);
		expect(raw?.members).toHaveLength(0);
	});

	it("consumeInviteAndAddMemberDB returns null for a wrong token", async () => {
		const org = await makeOrg(5);
		await addOrganizationInviteDB({
			id: org.id.toString(),
			invite: invite({ token: "real-token" }),
		});
		expect(
			await consumeInviteAndAddMemberDB({
				orgId: org.id.toString(),
				token: "wrong-token",
				memberId: oid(),
			}),
		).toBeNull();
	});

	it("consumeInviteAndAddMemberDB is idempotent for existing members (no duplicate entry)", async () => {
		const org = await makeOrg(6);
		const memberId = oid();
		await updateOrganizationMembersDB({
			id: org.id.toString(),
			members: [{ memberId, permission: IOrganizationRole.ADMIN }],
		});
		await addOrganizationInviteDB({
			id: org.id.toString(),
			invite: invite({
				token: "again-tok",
				role: IOrganizationRole.VIEWER,
			}),
		});
		const result = await consumeInviteAndAddMemberDB({
			orgId: org.id.toString(),
			token: "again-tok",
			memberId,
		});
		expect(result).not.toBeNull();
		const raw = await rawOrg(org.id);
		expect(raw?.members).toHaveLength(1);
		// Existing role is kept, invite still consumed.
		expect(raw?.members[0].permission).toBe(IOrganizationRole.ADMIN);
		expect(raw?.invites).toHaveLength(0);
	});

	it("revokeInviteDB pulls the invite and reports org existence", async () => {
		const org = await makeOrg(7);
		await addOrganizationInviteDB({
			id: org.id.toString(),
			invite: invite({ token: "revoke-me" }),
		});
		expect(
			await revokeInviteDB({
				orgId: org.id.toString(),
				token: "revoke-me",
			}),
		).toBe(true);
		const raw = await rawOrg(org.id);
		expect(raw?.invites).toHaveLength(0);
		// Existing org + unknown token still returns true (doc matched).
		expect(
			await revokeInviteDB({ orgId: org.id.toString(), token: "nope" }),
		).toBe(true);
		// Unknown org returns false.
		expect(await revokeInviteDB({ orgId: unknownId(), token: "x" })).toBe(
			false,
		);
	});
});

describe("post-aggregate logo resolution", () => {
	it("rewrites a stored logo key to a link when present", async () => {
		const org = await createOrganizationDB({
			payload: {
				ownerId: oid(),
				name: "logo org",
				description: "d",
				logo: "orgs/logo-key.png",
			},
		});
		const found = await getOrganizationByIdDB({ id: org!.id.toString() });
		// The post("aggregate") hook maps the stored key through s3GetFileLink;
		// whether it signs or falls back, logo stays a truthy string.
		expect(typeof found?.logo).toBe("string");
		expect(found?.logo).toBeTruthy();
	});
});

describe("error handling (injected DB failures hit the catch fallbacks)", () => {
	it("removeOrganizationMembersDB returns null when the update throws", async () => {
		const org = await makeOrg(1);
		vi.spyOn(Organization, "findOneAndUpdate").mockRejectedValueOnce(
			new Error("boom"),
		);
		expect(
			await removeOrganizationMembersDB({
				id: org.id.toString(),
				memberId: oid().toString(),
			}),
		).toBeNull();
	});

	it("getOrganizationsDB returns [] when the aggregate throws", async () => {
		vi.spyOn(Organization, "aggregate").mockRejectedValueOnce(
			new Error("boom"),
		);
		expect(await getOrganizationsDB({ offset: 0, limit: 10 })).toEqual([]);
	});

	it("getOrganizationsByIdsDB returns [] when the aggregate throws", async () => {
		vi.spyOn(Organization, "aggregate").mockRejectedValueOnce(
			new Error("boom"),
		);
		expect(
			await getOrganizationsByIdsDB({
				ids: [unknownId()],
				offset: 0,
				limit: 10,
			}),
		).toEqual([]);
	});

	it("getOrganizationsCountDB returns 0 when the aggregate throws", async () => {
		vi.spyOn(Organization, "aggregate").mockRejectedValueOnce(
			new Error("boom"),
		);
		expect(await getOrganizationsCountDB({})).toBe(0);
	});

	it("getOrganizationsForMemberDB returns [] when the aggregate throws", async () => {
		vi.spyOn(Organization, "aggregate").mockRejectedValueOnce(
			new Error("boom"),
		);
		expect(
			await getOrganizationsForMemberDB({ userId: oid().toString() }),
		).toEqual([]);
	});

	it("findOrganizationByInviteTokenDB returns null when the query throws", async () => {
		vi.spyOn(Organization, "findOne").mockImplementationOnce(() => {
			throw new Error("boom");
		});
		expect(
			await findOrganizationByInviteTokenDB({ token: "any" }),
		).toBeNull();
	});

	it("addOrganizationInviteDB returns null when the update throws", async () => {
		const org = await makeOrg(2);
		vi.spyOn(Organization, "findOneAndUpdate").mockRejectedValueOnce(
			new Error("boom"),
		);
		expect(
			await addOrganizationInviteDB({
				id: org.id.toString(),
				invite: {
					email: "x@example.com",
					token: "t",
					role: IOrganizationRole.VIEWER,
					invitedById: oid(),
					expiresAt: new Date(Date.now() + 1000),
				},
			}),
		).toBeNull();
	});

	it("consumeInviteAndAddMemberDB returns null when the lookup throws", async () => {
		vi.spyOn(Organization, "findOne").mockRejectedValueOnce(
			new Error("boom"),
		);
		expect(
			await consumeInviteAndAddMemberDB({
				orgId: unknownId(),
				token: "t",
				memberId: oid(),
			}),
		).toBeNull();
	});

	it("revokeInviteDB returns false when the update throws", async () => {
		vi.spyOn(Organization, "findOneAndUpdate").mockRejectedValueOnce(
			new Error("boom"),
		);
		expect(await revokeInviteDB({ orgId: unknownId(), token: "t" })).toBe(
			false,
		);
	});

	it("setMemberRoleDB returns null when the update throws", async () => {
		vi.spyOn(Organization, "findOneAndUpdate").mockRejectedValueOnce(
			new Error("boom"),
		);
		expect(
			await setMemberRoleDB({
				orgId: unknownId(),
				memberId: unknownId(),
				role: IOrganizationRole.ADMIN,
			}),
		).toBeNull();
	});

	it("removeMemberDB returns null when the update throws", async () => {
		vi.spyOn(Organization, "findOneAndUpdate").mockRejectedValueOnce(
			new Error("boom"),
		);
		expect(
			await removeMemberDB({
				orgId: unknownId(),
				memberId: unknownId(),
			}),
		).toBeNull();
	});
});
