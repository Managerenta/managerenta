// Real integration tests for src/server/services/auth/** against the
// per-worker scratch MongoDB and local Redis (see tests/setup.ts).
// No production database is touched; every test uses freshly minted
// emails/usernames so the Redis caches keyed by user id/email can never
// serve stale data across tests.
import "./uniqueScratchDb"; // MUST stay the first import — see that file
import { randomBytes } from "node:crypto";
import mongoose from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
	ErrInvalidCredentials,
	verifyTwoFactorTicket,
} from "../../../src/server/constants";
import { disconnectRedis } from "../../../src/server/databases";
import { updateUserRawDB, User } from "../../../src/server/models";
import {
	login,
	logout,
	reLoginUserWithRefreshToken,
	removeExpiredUsersTokens,
	signup,
} from "../../../src/server/services/auth";
import { deleteUser } from "../../../src/server/services/users";
import { clearTestDB, connectTestDB, dropTestDB } from "../../helpers/db";

function uniq(prefix: string): string {
	return `${prefix}-${randomBytes(6).toString("hex")}`;
}

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

/** Read the raw refresh-token array straight from the scratch DB. */
async function refreshTokensOf(userId: string) {
	const doc = await User.findById(new mongoose.Types.ObjectId(userId))
		.select("+refreshTokens")
		.lean();
	return doc?.refreshTokens ?? [];
}

async function signupUser(overrides: Record<string, unknown> = {}) {
	const payload = userPayload(overrides);
	const session = await signup({ payload: payload as never, ip: "1.2.3.4" });
	expect(session).not.toBeNull();
	if (!session) throw new Error("signup failed");
	return { payload, session };
}

beforeAll(async () => {
	await connectTestDB();
	await clearTestDB();
	// The dupe-email / dupe-username behaviour depends on the unique
	// indexes actually existing in the scratch DB. NOTE: `User.init()`
	// cannot be used — the schema's passkey index mixes `sparse` with
	// `partialFilterExpression`, which MongoDB rejects (reported as a
	// finding). Build just the indexes these tests depend on.
	await User.collection.createIndex({ email: 1 }, { unique: true });
	await User.collection.createIndex({ username: 1 }, { unique: true });
});

afterAll(async () => {
	await dropTestDB();
	await disconnectRedis();
});

describe("auth/signup", () => {
	it("creates the user and immediately issues a session", async () => {
		const { payload, session } = await signupUser();

		expect(session.accessToken).toBeTruthy();
		expect(session.refreshToken).toBeTruthy();
		expect(session.userId).toBeTruthy();

		const doc = await User.findById(session.userId)
			.select("+password +refreshTokens")
			.lean();
		expect(doc).not.toBeNull();
		expect(doc?.email).toBe(payload.email.toLowerCase());
		expect(doc?.username).toBe(payload.username);
		// password must be bcrypt-hashed at rest, never plaintext
		expect(doc?.password).not.toBe(payload.password);
		expect(doc?.password).toMatch(/^\$2[aby]\$/);
		// the issued refresh token is persisted on the user document
		expect(
			doc?.refreshTokens?.some(
				(t) => t.refreshToken === session.refreshToken,
			),
		).toBe(true);
	});

	it("rejects a duplicate email (returns null, no second user)", async () => {
		const { payload } = await signupUser();

		const dupe = await signup({
			payload: userPayload({ email: payload.email }) as never,
		});
		expect(dupe).toBeNull();

		const count = await User.countDocuments({
			email: payload.email.toLowerCase(),
		});
		expect(count).toBe(1);
	});

	it("rejects a duplicate username", async () => {
		const { payload } = await signupUser();

		const dupe = await signup({
			payload: userPayload({ username: payload.username }) as never,
		});
		expect(dupe).toBeNull();

		const count = await User.countDocuments({
			username: payload.username,
		});
		expect(count).toBe(1);
	});
});

describe("auth/login", () => {
	it("returns a session for the correct password and persists the refresh token", async () => {
		const { payload, session: signupSession } = await signupUser();

		const result = await login({
			email: payload.email,
			password: payload.password,
			ip: "10.0.0.1",
		});
		expect(result).not.toBeNull();
		if (!result || result.twoFactorRequired) {
			throw new Error("expected a plain session");
		}
		expect(result.twoFactorRequired).toBe(false);
		expect(result.session.accessToken).toBeTruthy();
		expect(result.session.refreshToken).toBeTruthy();
		expect(result.session.userId).toBe(signupSession.userId);

		const tokens = await refreshTokensOf(signupSession.userId);
		expect(
			tokens.some(
				(t) => t.refreshToken === result.session.refreshToken,
			),
		).toBe(true);
	});

	it("accepts the email case-insensitively", async () => {
		const { payload } = await signupUser();
		const result = await login({
			email: payload.email.toUpperCase(),
			password: payload.password,
		});
		expect(result).not.toBeNull();
	});

	it("throws ErrInvalidCredentials for a wrong password", async () => {
		const { payload } = await signupUser();
		await expect(
			login({ email: payload.email, password: "totally-wrong" }),
		).rejects.toBe(ErrInvalidCredentials);
	});

	it("throws ErrInvalidCredentials for an unknown email", async () => {
		await expect(
			login({
				email: `${uniq("ghost")}@vitest.example.com`,
				password: "whatever",
			}),
		).rejects.toBe(ErrInvalidCredentials);
	});

	it("throws ErrInvalidCredentials for a soft-deleted user", async () => {
		const { payload, session } = await signupUser();
		await deleteUser({ id: session.userId });
		await expect(
			login({ email: payload.email, password: payload.password }),
		).rejects.toBe(ErrInvalidCredentials);
	});

	it("returns a 2FA ticket — not tokens — when 2FA is enabled, and issues no session", async () => {
		const { payload, session } = await signupUser();
		const tokensBefore = await refreshTokensOf(session.userId);

		const enabled = await updateUserRawDB({
			id: session.userId,
			update: { $set: { "security.twoFactorEnabled": true } },
		});
		expect(enabled).not.toBeNull();

		const result = await login({
			email: payload.email,
			password: payload.password,
			ip: "10.0.0.9",
		});
		expect(result).not.toBeNull();
		if (!result) throw new Error("unreachable");
		expect(result.twoFactorRequired).toBe(true);
		if (!result.twoFactorRequired) throw new Error("unreachable");

		// The ticket is a domain-separated challenge for THIS user...
		const ticketPayload = verifyTwoFactorTicket(result.ticket);
		expect(ticketPayload?.userId).toBe(session.userId);

		// ...and carries no session material of any kind.
		expect(
			(result as unknown as Record<string, unknown>).session,
		).toBeUndefined();
		expect(
			(result as unknown as Record<string, unknown>).accessToken,
		).toBeUndefined();
		expect(
			(result as unknown as Record<string, unknown>).refreshToken,
		).toBeUndefined();

		// No refresh token was minted by the password step alone: 2FA
		// cannot be bypassed by just POSTing the password.
		const tokensAfter = await refreshTokensOf(session.userId);
		expect(tokensAfter.length).toBe(tokensBefore.length);

		// Even with 2FA pending, a wrong password still fails outright.
		await expect(
			login({ email: payload.email, password: "wrong" }),
		).rejects.toBe(ErrInvalidCredentials);
	});
});

describe("auth/reLoginUserWithRefreshToken", () => {
	it("rotates a valid refresh token (old revoked, new persisted)", async () => {
		const { session } = await signupUser();

		const next = await reLoginUserWithRefreshToken({
			id: session.userId,
			refreshToken: session.refreshToken,
			ip: "10.0.0.2",
		});
		expect(next).not.toBeNull();
		expect(next?.refreshToken).toBeTruthy();
		expect(next?.refreshToken).not.toBe(session.refreshToken);

		const tokens = await refreshTokensOf(session.userId);
		const raw = tokens.map((t) => t.refreshToken);
		expect(raw).toContain(next?.refreshToken);
		expect(raw).not.toContain(session.refreshToken);
	});

	it("rejects reuse of an already-consumed token (single use)", async () => {
		const { session } = await signupUser();

		const first = await reLoginUserWithRefreshToken({
			id: session.userId,
			refreshToken: session.refreshToken,
			ip: "10.0.0.3",
		});
		expect(first).not.toBeNull();

		const replay = await reLoginUserWithRefreshToken({
			id: session.userId,
			refreshToken: session.refreshToken,
			ip: "10.0.0.3",
		});
		expect(replay).toBeNull();
	});

	it("rejects an expired refresh token", async () => {
		const { session } = await signupUser();

		// Force the deadline into the past directly in the scratch DB.
		await User.updateOne(
			{
				_id: new mongoose.Types.ObjectId(session.userId) as unknown as string,
				"refreshTokens.refreshToken": session.refreshToken,
			},
			{
				$set: {
					"refreshTokens.$.deadline": new Date(Date.now() - 1000),
				},
			},
		);

		const result = await reLoginUserWithRefreshToken({
			id: session.userId,
			refreshToken: session.refreshToken,
			ip: "10.0.0.4",
		});
		expect(result).toBeNull();
	});

	it("rejects a token belonging to a soft-deleted user", async () => {
		const { session } = await signupUser();
		await deleteUser({ id: session.userId });

		const result = await reLoginUserWithRefreshToken({
			id: session.userId,
			refreshToken: session.refreshToken,
			ip: "10.0.0.5",
		});
		expect(result).toBeNull();
	});
});

describe("auth/logout", () => {
	it("revokes exactly the presented refresh token, leaving other sessions alive", async () => {
		const { payload, session: sessionA } = await signupUser();
		// distinct sign-in => distinct token (avoid same-ms collisions)
		await new Promise((r) => setTimeout(r, 10));
		const loginB = await login({
			email: payload.email,
			password: payload.password,
			ip: "10.0.0.6",
		});
		if (!loginB || loginB.twoFactorRequired) {
			throw new Error("expected a session");
		}
		const sessionB = loginB.session;
		expect(sessionB.refreshToken).not.toBe(sessionA.refreshToken);

		const ok = await logout({
			userId: sessionA.userId,
			token: sessionA.refreshToken,
		});
		expect(ok).toBe(true);

		const raw = (await refreshTokensOf(sessionA.userId)).map(
			(t) => t.refreshToken,
		);
		expect(raw).not.toContain(sessionA.refreshToken);
		expect(raw).toContain(sessionB.refreshToken);

		// The revoked token can no longer be used to refresh.
		const replay = await reLoginUserWithRefreshToken({
			id: sessionA.userId,
			refreshToken: sessionA.refreshToken,
			ip: "10.0.0.7",
		});
		expect(replay).toBeNull();
	});
});

describe("auth/removeExpiredUsersTokens", () => {
	it("prunes only the expired refresh tokens", async () => {
		const { payload, session } = await signupUser();
		await new Promise((r) => setTimeout(r, 10));
		const second = await login({
			email: payload.email,
			password: payload.password,
		});
		if (!second || second.twoFactorRequired) {
			throw new Error("expected a session");
		}

		// Expire only the first session's token.
		await User.updateOne(
			{
				_id: new mongoose.Types.ObjectId(session.userId) as unknown as string,
				"refreshTokens.refreshToken": session.refreshToken,
			},
			{
				$set: {
					"refreshTokens.$.deadline": new Date(Date.now() - 60_000),
				},
			},
		);

		const acknowledged = await removeExpiredUsersTokens();
		expect(acknowledged).toBe(true);

		const raw = (await refreshTokensOf(session.userId)).map(
			(t) => t.refreshToken,
		);
		expect(raw).not.toContain(session.refreshToken);
		expect(raw).toContain(second.session.refreshToken);
	});
});
