// Real integration tests for src/server/services/users/** against the
// per-worker scratch MongoDB and the local Redis instance.
//
// Only true externals are mocked: `uploadAndResizeImage` (sharp + S3 upload)
// is replaced so avatar flows never reach AWS. Everything else — models,
// bcrypt, Redis caching — runs for real.
import "./uniqueScratchDb"; // MUST stay the first import — see that file
import { randomBytes } from "node:crypto";
import mongoose from "mongoose";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
	ErrInvalidCredentials,
	hash as sha256,
} from "../../../src/server/constants";
import { disconnectRedis, Redis } from "../../../src/server/databases";
import { uploadAndResizeImage } from "../../../src/server/helpers";
import { User } from "../../../src/server/models";
import { login, signup } from "../../../src/server/services/auth";
import {
	changePassword,
	createUser,
	deleteUser,
	getSessions,
	getUserByEmail,
	getUserById,
	getUsersByEmails,
	getUsersByIds,
	revokeAllSessions,
	revokeSession,
	updateUser,
	updateUserSettings,
} from "../../../src/server/services/users";
import { getQueryKey as userByEmailKey } from "../../../src/server/services/users/getUserByEmail";
import {
	clearInProcessCache,
	getQueryKey as userByIdKey,
} from "../../../src/server/services/users/getUserById";
import { getQueryKey as usersByEmailsKey } from "../../../src/server/services/users/getUsersByEmails";
import { getQueryKey as usersByIdsKey } from "../../../src/server/services/users/getUsersByIds";
import { invalidateCacheKeys } from "../../../src/server/services/users/utils";
import { clearTestDB, connectTestDB, dropTestDB } from "../../helpers/db";

// External boundary: image resize + S3 upload. Never hit AWS from tests.
vi.mock("../../../src/server/helpers", async (importOriginal) => {
	const actual =
		await importOriginal<typeof import("../../../src/server/helpers")>();
	return {
		...actual,
		uploadAndResizeImage: vi.fn(
			async ({ bufferOrUrl }: { bufferOrUrl?: Buffer | string }) =>
				bufferOrUrl ? "users/avatars/mocked-avatar.webp" : null,
		),
	};
});

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
	const session = await signup({ payload: payload as never, ip: "1.1.1.1" });
	if (!session) throw new Error("signup failed");
	return { payload, session, userId: session.userId };
}

beforeAll(async () => {
	await connectTestDB();
	await clearTestDB();
	// `User.init()` fails on MongoDB (schema mixes `sparse` and
	// `partialFilterExpression` on the passkey index) — build only the
	// unique indexes the dupe tests need.
	await User.collection.createIndex({ email: 1 }, { unique: true });
	await User.collection.createIndex({ username: 1 }, { unique: true });
});

afterAll(async () => {
	await dropTestDB();
	await disconnectRedis();
});

describe("users/createUser", () => {
	it("creates a user without an avatar (no upload attempted result stored)", async () => {
		const payload = userPayload();
		const user = await createUser({ payload: payload as never });
		expect(user).not.toBeNull();
		expect(user?.avatar).toBeUndefined();
		expect(user?.email).toBe(payload.email);
	});

	it("stores the uploaded avatar file name when an avatar buffer is given", async () => {
		const payload = userPayload({ avatar: Buffer.from("fake-image") });
		const user = await createUser({ payload: payload as never });
		expect(user).not.toBeNull();
		expect(user?.avatar).toBe("users/avatars/mocked-avatar.webp");
	});

	it("returns null on duplicate email", async () => {
		const { payload } = await signupUser();
		const dupe = await createUser({
			payload: userPayload({ email: payload.email }) as never,
		});
		expect(dupe).toBeNull();
	});
});

describe("users/getUserById caching", () => {
	it("caches the user in Redis under the documented key", async () => {
		const { userId, payload } = await signupUser();

		const first = await getUserById({ id: userId });
		expect(first?.email).toBe(payload.email);
		// no secrets leak through the aggregation projection
		expect(
			(first as unknown as Record<string, unknown>).password,
		).toBeUndefined();
		expect(
			(first as unknown as Record<string, unknown>).refreshTokens,
		).toBeUndefined();

		const exists = await Redis.exists(userByIdKey({ id: userId }));
		expect(exists).toBe(1);
	});

	it("serves the second call from cache (stale after an uninvalidated direct write)", async () => {
		const { userId } = await signupUser();
		const first = await getUserById({ id: userId });
		expect(first).not.toBeNull();

		// Mutate the row behind the cache's back.
		await User.updateOne(
			{ _id: new mongoose.Types.ObjectId(userId) as unknown as string },
			{ $set: { name: "Changed Behind Cache" } },
		);

		const cachedRead = await getUserById({ id: userId });
		expect(cachedRead?.name).toBe(first?.name); // still the old name

		const freshRead = await getUserById({ id: userId, refreshCache: true });
		expect(freshRead?.name).toBe("Changed Behind Cache");
	});

	it("invalidateCacheKeys drops both the Redis and in-process entries", async () => {
		const { userId, payload } = await signupUser();
		await getUserById({ id: userId });
		expect(await Redis.exists(userByIdKey({ id: userId }))).toBe(1);

		await User.updateOne(
			{ _id: new mongoose.Types.ObjectId(userId) as unknown as string },
			{ $set: { name: "Post Invalidate" } },
		);
		await invalidateCacheKeys({ id: userId, email: payload.email });

		expect(await Redis.exists(userByIdKey({ id: userId }))).toBe(0);
		const read = await getUserById({ id: userId });
		expect(read?.name).toBe("Post Invalidate");
	});

	it("falls back to the Redis layer when the in-process memo is cleared", async () => {
		const { userId } = await signupUser();
		const first = await getUserById({ id: userId }); // warms both layers

		// Drop only the in-process memo (whole-map variant too) and mutate
		// the row: the next read must come from Redis, i.e. still stale.
		clearInProcessCache(userId);
		clearInProcessCache();
		await User.updateOne(
			{ _id: new mongoose.Types.ObjectId(userId) as unknown as string },
			{ $set: { name: "Only In Mongo" } },
		);

		const redisServed = await getUserById({ id: userId });
		expect(redisServed?.name).toBe(first?.name);
		expect(redisServed?.name).not.toBe("Only In Mongo");
	});

	it("returns null for an unknown id", async () => {
		expect(
			await getUserById({
				id: new mongoose.Types.ObjectId().toString(),
			}),
		).toBeNull();
	});
});

describe("users/getUserByEmail caching", () => {
	it("returns the user and stores it under the email cache key", async () => {
		const { payload, userId } = await signupUser();
		const user = await getUserByEmail({ email: payload.email });
		expect(String(user?._id)).toBe(userId);
		expect(
			await Redis.exists(userByEmailKey({ email: payload.email })),
		).toBe(1);
	});

	it("serves the second call from the Redis cache", async () => {
		const { payload } = await signupUser();
		const first = await getUserByEmail({ email: payload.email });
		expect(first).not.toBeNull();

		await User.updateOne(
			{ email: payload.email },
			{ $set: { name: "Renamed Behind Email Cache" } },
		);

		const cached = await getUserByEmail({ email: payload.email });
		expect(cached?.name).toBe(first?.name); // stale => cache hit

		const fresh = await getUserByEmail({
			email: payload.email,
			refreshCache: true,
		});
		expect(fresh?.name).toBe("Renamed Behind Email Cache");
	});

	it("returns null for an unknown email", async () => {
		expect(
			await getUserByEmail({
				email: `ghost-${randomBytes(6).toString("hex")}@nowhere.test`,
			}),
		).toBeNull();
	});
});

describe("users/getUsersByIds + getUsersByEmails caching", () => {
	it("getUsersByIds returns the users and caches under the hashed-ids key", async () => {
		const a = await signupUser();
		const b = await signupUser();
		const ids = [a.userId, b.userId];

		const result = await getUsersByIds({ ids, offset: 0, limit: 10 });
		expect(result.map((u) => String(u._id)).sort()).toEqual(
			[...ids].sort(),
		);

		const key = usersByIdsKey({ ids: sha256(ids.join(",")) });
		expect(await Redis.exists(key)).toBe(1);

		// second call is a cache hit: stale after a direct write
		await User.updateOne(
			{ _id: new mongoose.Types.ObjectId(a.userId) as unknown as string },
			{ $set: { name: "Stale Check" } },
		);
		const cached = await getUsersByIds({ ids, offset: 0, limit: 10 });
		expect(cached.find((u) => String(u._id) === a.userId)?.name).not.toBe(
			"Stale Check",
		);

		const fresh = await getUsersByIds({
			ids,
			offset: 0,
			limit: 10,
			refreshCache: true,
		});
		expect(fresh.find((u) => String(u._id) === a.userId)?.name).toBe(
			"Stale Check",
		);
	});

	it("getUsersByIds respects offset/limit and returns [] for unknown ids", async () => {
		const a = await signupUser();
		const b = await signupUser();
		const ids = [a.userId, b.userId];

		const limited = await getUsersByIds({
			ids,
			offset: 0,
			limit: 1,
			refreshCache: true,
		});
		expect(limited).toHaveLength(1);

		const none = await getUsersByIds({
			ids: [new mongoose.Types.ObjectId().toString()],
			offset: 0,
			limit: 10,
			refreshCache: true,
		});
		expect(none).toEqual([]);
	});

	it("getUsersByEmails returns matching users and caches them", async () => {
		const a = await signupUser();
		const b = await signupUser();
		const emails = [a.payload.email, b.payload.email];

		const result = await getUsersByEmails({
			emails,
			offset: 0,
			limit: 10,
		});
		expect(result.map((u) => u.email).sort()).toEqual([...emails].sort());
		expect(
			await Redis.exists(
				usersByEmailsKey({ emails: sha256(emails.join(",")) }),
			),
		).toBe(1);

		// second call for the same email set is served from the cache
		await User.updateOne(
			{ email: a.payload.email },
			{ $set: { name: "Renamed Behind Emails Cache" } },
		);
		const cached = await getUsersByEmails({
			emails,
			offset: 0,
			limit: 10,
		});
		expect(cached.find((u) => u.email === a.payload.email)?.name).not.toBe(
			"Renamed Behind Emails Cache",
		);

		// unknown email → empty result
		const none = await getUsersByEmails({
			emails: [`ghost-${randomBytes(6).toString("hex")}@nowhere.test`],
			offset: 0,
			limit: 10,
			refreshCache: true,
		});
		expect(none).toEqual([]);
	});
});

describe("users/updateUser", () => {
	it("updates profile fields and invalidates the id cache", async () => {
		const { userId } = await signupUser();
		await getUserById({ id: userId }); // warm caches

		const result = await updateUser({
			id: userId,
			payload: { name: "Renamed User", phone: "+15550001111" },
		});
		expect(result).not.toBeNull();

		const doc = await User.findById(userId).lean();
		expect(doc?.name).toBe("Renamed User");
		expect(doc?.phone).toBe("+15550001111");

		// service invalidated its own caches — read-through sees new value
		const cached = await getUserById({ id: userId });
		expect(cached?.name).toBe("Renamed User");
	});

	it("uploads and stores a new avatar via the (mocked) image pipeline", async () => {
		const { userId } = await signupUser();
		const result = await updateUser({
			id: userId,
			payload: { avatar: Buffer.from("new-image") },
		});
		expect(result).not.toBeNull();
		const doc = await User.findById(userId).lean();
		expect(doc?.avatar).toBe("users/avatars/mocked-avatar.webp");
	});

	it("returns null for a non-existent user", async () => {
		const result = await updateUser({
			id: new mongoose.Types.ObjectId().toString(),
			payload: { name: "Nobody" },
		});
		expect(result).toBeNull();
	});

	it("throws ErrTryAgain when the avatar upload fails, leaving the user unchanged", async () => {
		const { ErrTryAgain } = await import("../../../src/server/constants");
		const { userId } = await signupUser();
		vi.mocked(uploadAndResizeImage).mockResolvedValueOnce(null);

		await expect(
			updateUser({
				id: userId,
				payload: {
					name: "Should Not Apply",
					avatar: Buffer.from("broken"),
				},
			}),
		).rejects.toBe(ErrTryAgain);

		const doc = await User.findById(userId).lean();
		expect(doc?.name).not.toBe("Should Not Apply");
		expect(doc?.avatar).toBeUndefined();
	});
});

describe("users/changePassword", () => {
	it("rejects when the current password is wrong and keeps sessions", async () => {
		const { userId } = await signupUser();
		await expect(
			changePassword({
				userId,
				currentPassword: "not-the-password",
				newPassword: "another-password",
			}),
		).rejects.toBe(ErrInvalidCredentials);

		const doc = await User.findById(userId).select("+refreshTokens").lean();
		expect(doc?.refreshTokens?.length).toBeGreaterThan(0);
	});

	it("rejects for a non-existent user", async () => {
		await expect(
			changePassword({
				userId: new mongoose.Types.ObjectId().toString(),
				currentPassword: "irrelevant",
				newPassword: "irrelevant-2",
			}),
		).rejects.toBe(ErrInvalidCredentials);
	});

	it("changes the password and revokes every refresh token", async () => {
		const { payload, userId } = await signupUser();
		await new Promise((r) => setTimeout(r, 10));
		await login({ email: payload.email, password: payload.password });

		const before = await User.findById(userId)
			.select("+refreshTokens")
			.lean();
		expect(before?.refreshTokens?.length).toBeGreaterThanOrEqual(2);

		const ok = await changePassword({
			userId,
			currentPassword: payload.password,
			newPassword: "brand-new-password",
		});
		expect(ok).toBe(true);

		const after = await User.findById(userId)
			.select("+refreshTokens")
			.lean();
		expect(after?.refreshTokens).toEqual([]);

		// old password dead, new password live
		await expect(
			login({ email: payload.email, password: payload.password }),
		).rejects.toBe(ErrInvalidCredentials);
		const relogin = await login({
			email: payload.email,
			password: "brand-new-password",
		});
		expect(relogin).not.toBeNull();
	});
});

describe("users/updateUserSettings", () => {
	it("updates preferences without clobbering untouched keys", async () => {
		const { userId } = await signupUser();
		const result = await updateUserSettings({
			id: userId,
			section: "preferences",
			payload: { theme: "dark", currency: "EUR" },
		});
		expect(result).not.toBeNull();

		const doc = await User.findById(userId).lean();
		expect(doc?.preferences?.theme).toBe("dark");
		expect(doc?.preferences?.currency).toBe("EUR");
		// untouched defaults survive ($set on dotted paths, not replace)
		expect(doc?.preferences?.language).toBeTruthy();
		expect(doc?.preferences?.dateFormat).toBeTruthy();
	});

	it("updates notification toggles", async () => {
		const { userId } = await signupUser();
		await updateUserSettings({
			id: userId,
			section: "notifications",
			payload: { emailEnabled: false, paymentOverdue: false },
		});
		const doc = await User.findById(userId).lean();
		expect(doc?.notifications?.emailEnabled).toBe(false);
		expect(doc?.notifications?.paymentOverdue).toBe(false);
		// untouched key keeps its default (paymentReceived defaults true)
		expect(doc?.notifications?.paymentReceived).toBe(true);
	});

	it("updates reminder settings and refreshes the user cache", async () => {
		const { userId } = await signupUser();
		await getUserById({ id: userId }); // warm cache with defaults

		await updateUserSettings({
			id: userId,
			section: "reminders",
			payload: { rentDueLeadDays: 9, autoSendOnDueDay: true },
		});

		const doc = await User.findById(userId).lean();
		expect(doc?.reminders?.rentDueLeadDays).toBe(9);
		expect(doc?.reminders?.autoSendOnDueDay).toBe(true);

		// the cache was invalidated + prewarmed — a read must see the update
		const cached = await getUserById({ id: userId });
		expect(cached?.reminders?.rentDueLeadDays).toBe(9);
	});

	it("returns null for a non-existent user", async () => {
		const result = await updateUserSettings({
			id: new mongoose.Types.ObjectId().toString(),
			section: "preferences",
			payload: { theme: "dark" },
		});
		expect(result).toBeNull();
	});
});

describe("users/deleteUser (soft delete)", () => {
	it("marks the user deleted, keeps the row, and hides it from reads/login", async () => {
		const { payload, userId } = await signupUser();
		await getUserById({ id: userId }); // warm cache — delete must bust it

		const result = await deleteUser({ id: userId });
		expect(result).not.toBeNull();

		// row still exists (soft delete), flagged deleted
		const raw = await User.findById(userId).select("+deleted").lean();
		expect(raw).not.toBeNull();
		expect(raw?.deleted).toBe(true);

		// hidden from the service read path (aggregate filters deleted)
		const read = await getUserById({ id: userId });
		expect(read).toBeNull();

		// and can no longer log in
		await expect(
			login({ email: payload.email, password: payload.password }),
		).rejects.toBe(ErrInvalidCredentials);
	});

	it("returns null for an unknown id", async () => {
		expect(
			await deleteUser({
				id: new mongoose.Types.ObjectId().toString(),
			}),
		).toBeNull();
	});
});

describe("users/getSessions + revocation", () => {
	it("lists sessions as sha256 ids, flags the current one, never exposes raw tokens", async () => {
		const { payload, session } = await signupUser();
		await new Promise((r) => setTimeout(r, 10));
		const second = await login({
			email: payload.email,
			password: payload.password,
		});
		if (!second || second.twoFactorRequired) {
			throw new Error("expected session");
		}

		const sessions = await getSessions({
			userId: session.userId,
			currentRefreshToken: second.session.refreshToken,
		});
		expect(sessions.length).toBe(2);
		for (const s of sessions) {
			expect(s.id).toMatch(/^[a-f0-9]{64}$/);
			expect(s.id).not.toBe(session.refreshToken);
			expect(Object.keys(s).sort()).toEqual([
				"createdAt",
				"current",
				"expiresAt",
				"id",
			]);
		}
		expect(sessions.filter((s) => s.current).length).toBe(1);
	});

	it("revokeSession removes exactly the targeted session", async () => {
		const { payload, session } = await signupUser();
		await new Promise((r) => setTimeout(r, 10));
		const second = await login({
			email: payload.email,
			password: payload.password,
		});
		if (!second || second.twoFactorRequired) {
			throw new Error("expected session");
		}

		const sessions = await getSessions({
			userId: session.userId,
			currentRefreshToken: second.session.refreshToken,
		});
		const other = sessions.find((s) => !s.current);
		if (!other) throw new Error("expected a non-current session");

		expect(
			await revokeSession({
				userId: session.userId,
				sessionId: other.id,
			}),
		).toBe(true);

		const remaining = await getSessions({
			userId: session.userId,
			currentRefreshToken: second.session.refreshToken,
		});
		expect(remaining.length).toBe(1);
		expect(remaining[0]?.current).toBe(true);

		// unknown session id → false
		expect(
			await revokeSession({
				userId: session.userId,
				sessionId: "0".repeat(64),
			}),
		).toBe(false);
	});

	it("revokeAllSessions keeps only the excepted (current) token", async () => {
		const { payload, session } = await signupUser();
		await new Promise((r) => setTimeout(r, 10));
		await login({ email: payload.email, password: payload.password });
		await new Promise((r) => setTimeout(r, 10));
		const current = await login({
			email: payload.email,
			password: payload.password,
		});
		if (!current || current.twoFactorRequired) {
			throw new Error("expected session");
		}

		expect(
			await revokeAllSessions({
				userId: session.userId,
				exceptRefreshToken: current.session.refreshToken,
			}),
		).toBe(true);

		const doc = await User.findById(session.userId)
			.select("+refreshTokens")
			.lean();
		expect(doc?.refreshTokens?.length).toBe(1);
		expect(doc?.refreshTokens?.[0]?.refreshToken).toBe(
			current.session.refreshToken,
		);
	});

	it("revokeAllSessions with no exception wipes everything", async () => {
		const { session } = await signupUser();
		expect(await revokeAllSessions({ userId: session.userId })).toBe(true);
		const doc = await User.findById(session.userId)
			.select("+refreshTokens")
			.lean();
		expect(doc?.refreshTokens).toEqual([]);
	});
});
