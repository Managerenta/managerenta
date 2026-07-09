// Real integration tests for the user-suspension auth gate and the operator
// admin-user service (list / detail / status / group membership). Runs against
// the per-worker scratch MongoDB + local Redis — no production data touched.
import "./uniqueScratchDb"; // MUST stay the first import — see that file
import { randomBytes } from "node:crypto";
import mongoose from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ErrAccountRestricted } from "../../../src/server/constants";
import { disconnectRedis } from "../../../src/server/databases";
import { createIamGroupDB } from "../../../src/server/iam/models";
import { setUserStatusDB, User } from "../../../src/server/models";
import {
	login,
	reLoginUserWithRefreshToken,
	signup,
} from "../../../src/server/services/auth";
import {
	addUserGroupMembership,
	getPlatformUserDetail,
	listOrgGroupsForMembership,
	listPlatformUsers,
	removeUserGroupMembership,
	setPlatformUserStatus,
} from "../../../src/server/services/platform";
import { clearTestDB, connectTestDB, dropTestDB } from "../../helpers/db";

function userPayload(overrides: Record<string, unknown> = {}) {
	const tag = randomBytes(6).toString("hex");
	return {
		username: `user-${tag}`,
		email: `user-${tag}@vitest.example.com`,
		password: "s3cret-password",
		name: "Vitest User",
		...overrides,
	};
}

async function signupUser(overrides: Record<string, unknown> = {}) {
	const payload = userPayload(overrides);
	const session = await signup({ payload: payload as never, ip: "1.2.3.4" });
	if (!session) throw new Error("signup failed");
	return { payload, session };
}

beforeAll(async () => {
	await connectTestDB();
	await clearTestDB();
	await User.collection.createIndex({ email: 1 }, { unique: true });
	await User.collection.createIndex({ username: 1 }, { unique: true });
});

afterAll(async () => {
	await dropTestDB();
	await disconnectRedis();
});

describe("suspension auth gate", () => {
	it("blocks password login for a suspended user (ErrAccountRestricted)", async () => {
		const { payload, session } = await signupUser();
		const suspended = await setUserStatusDB({
			id: session.userId,
			status: "suspended",
		});
		expect(suspended?.status).toBe("suspended");

		await expect(
			login({ email: payload.email, password: payload.password }),
		).rejects.toBe(ErrAccountRestricted);
	});

	it("clears refresh tokens on suspend so an existing session cannot refresh", async () => {
		const { session } = await signupUser();

		await setUserStatusDB({ id: session.userId, status: "suspended" });

		// Token was purged by the suspend, and the refresh filter also excludes
		// suspended users — either way the refresh must fail closed.
		const refreshed = await reLoginUserWithRefreshToken({
			id: session.userId,
			refreshToken: session.refreshToken,
			ip: "10.0.0.1",
		});
		expect(refreshed).toBeNull();
	});

	it("restores login after reactivation", async () => {
		const { payload, session } = await signupUser();
		await setUserStatusDB({ id: session.userId, status: "suspended" });
		await expect(
			login({ email: payload.email, password: payload.password }),
		).rejects.toBe(ErrAccountRestricted);

		const reactivated = await setUserStatusDB({
			id: session.userId,
			status: "active",
		});
		expect(reactivated?.status).toBe("active");

		const result = await login({
			email: payload.email,
			password: payload.password,
		});
		expect(result).not.toBeNull();
		if (!result || result.twoFactorRequired) {
			throw new Error("expected a plain session");
		}
		expect(result.session.accessToken).toBeTruthy();
	});
});

describe("operator user directory", () => {
	it("lists users and matches a search term against name/email/username", async () => {
		const tag = randomBytes(5).toString("hex");
		const { payload } = await signupUser({ name: `Zed ${tag}` });

		const byName = await listPlatformUsers({ search: `Zed ${tag}` });
		expect(byName.users.some((u) => u.email === payload.email)).toBe(true);
		expect(byName.users.every((u) => u.status === "active")).toBe(true);

		const byEmail = await listPlatformUsers({ search: payload.email });
		expect(byEmail.total).toBeGreaterThanOrEqual(1);
		expect(byEmail.users[0]?.email).toBe(payload.email);
	});

	it("setPlatformUserStatus flips status and is reflected in the directory + blocks login", async () => {
		const { payload, session } = await signupUser();
		const row = await setPlatformUserStatus({
			userId: session.userId,
			status: "suspended",
		});
		expect(row?.status).toBe("suspended");

		await expect(
			login({ email: payload.email, password: payload.password }),
		).rejects.toBe(ErrAccountRestricted);

		const detail = await getPlatformUserDetail({ userId: session.userId });
		expect(detail?.status).toBe("suspended");
	});

	it("returns null detail for an unknown user id", async () => {
		const ghost = new mongoose.Types.ObjectId().toString();
		expect(await getPlatformUserDetail({ userId: ghost })).toBeNull();
		expect(
			await setPlatformUserStatus({ userId: ghost, status: "suspended" }),
		).toBeNull();
	});
});

describe("org-group membership management", () => {
	it("adds and removes a user's org-group membership and reflects it in detail", async () => {
		const { session } = await signupUser();
		const orgId = new mongoose.Types.ObjectId().toString();
		const group = await createIamGroupDB({
			payload: {
				name: `TestGroup-${randomBytes(4).toString("hex")}`,
				plane: "org",
				orgId,
				managedBy: "customer",
				attachedPolicyIds: [],
			},
		});
		if (!group) throw new Error("group create failed");
		const groupId = group._id.toString();

		// The group shows up in the membership catalogue.
		const catalogue = await listOrgGroupsForMembership();
		expect(catalogue.some((g) => g.groupId === groupId)).toBe(true);

		const added = await addUserGroupMembership({
			userId: session.userId,
			groupId,
		});
		expect(added.ok).toBe(true);

		const afterAdd = await getPlatformUserDetail({
			userId: session.userId,
		});
		expect(afterAdd?.memberships.some((m) => m.groupId === groupId)).toBe(
			true,
		);

		const removed = await removeUserGroupMembership({
			userId: session.userId,
			groupId,
		});
		expect(removed.ok).toBe(true);

		const afterRemove = await getPlatformUserDetail({
			userId: session.userId,
		});
		expect(
			afterRemove?.memberships.some((m) => m.groupId === groupId),
		).toBe(false);
	});

	it("rejects membership changes against an unknown group", async () => {
		const { session } = await signupUser();
		const ghostGroup = new mongoose.Types.ObjectId().toString();
		const res = await addUserGroupMembership({
			userId: session.userId,
			groupId: ghostGroup,
		});
		expect(res).toEqual({ ok: false, reason: "unknown-group" });
	});

	it("reports failure when removing a membership the user does not hold", async () => {
		const { session } = await signupUser();
		const group = await createIamGroupDB({
			payload: {
				name: `TestGroup-${randomBytes(4).toString("hex")}`,
				plane: "org",
				orgId: new mongoose.Types.ObjectId().toString(),
				managedBy: "customer",
				attachedPolicyIds: [],
			},
		});
		if (!group) throw new Error("group create failed");
		// Never added — the delete removes nothing, so the service reports failure.
		const res = await removeUserGroupMembership({
			userId: session.userId,
			groupId: group._id.toString(),
		});
		expect(res).toEqual({ ok: false, reason: "failed" });
	});

	it("rejects adding an unknown user to a real group", async () => {
		const orgId = new mongoose.Types.ObjectId().toString();
		const group = await createIamGroupDB({
			payload: {
				name: `TestGroup-${randomBytes(4).toString("hex")}`,
				plane: "org",
				orgId,
				managedBy: "customer",
				attachedPolicyIds: [],
			},
		});
		if (!group) throw new Error("group create failed");
		const res = await addUserGroupMembership({
			userId: new mongoose.Types.ObjectId().toString(),
			groupId: group._id.toString(),
		});
		expect(res).toEqual({ ok: false, reason: "unknown-user" });
	});
});
