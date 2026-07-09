import { createHash } from "node:crypto";
import { compare } from "bcrypt";
import { verify } from "jsonwebtoken";
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
	changePasswordDB,
	createUserDB,
	deleteUserDB,
	findUserBySecurityTokenDB,
	getUserByEmailDB,
	getUserByEmailWithPasswordDB,
	getUserByIdDB,
	getUserByIdWithPasswordDB,
	getUserByPasskeyCredentialIdDB,
	getUserSecretsDB,
	getUserSessionsDB,
	getUsersByEmailsDB,
	getUsersByIdsDB,
	loginUserDB,
	logoutUserDB,
	reLoginUserWithRefreshTokenDB,
	removeExpiredUsersTokensDB,
	revokeAllUserSessionsDB,
	revokeUserSessionDB,
	updateUserDB,
	updateUserRawDB,
	User,
} from "../../../src/server/models/users";
import type { IUserCreateInput } from "../../../src/server/models/users/types";
import { generateAuthToken } from "../../../src/server/models/users/utils";
import { clearTestDB, connectTestDB, dropTestDB } from "../../helpers/db";

function userPayload(n: number): IUserCreateInput {
	return {
		username: `user${n}`,
		email: `user${n}@example.com`,
		password: "secret-password-123",
		name: `User ${n}`,
	};
}

async function makeUser(n: number, extra: Partial<IUserCreateInput> = {}) {
	const user = await createUserDB({
		payload: { ...userPayload(n), ...extra },
	});
	expect(user).not.toBeNull();
	// biome-ignore lint/style/noNonNullAssertion: asserted above
	return user!;
}

const unknownId = () => new mongoose.Types.ObjectId().toString();

beforeAll(async () => {
	// SAFETY: never run against the dev database.
	expect(process.env.DB_NAME).toMatch(/^managerenta-vitest/);
	await connectTestDB();
	// Unique indexes (email/username) must exist for duplicate-key tests.
	// NOTE: `await User.init()` is unusable here — the schema's passkey index
	// combines `sparse: true` with `partialFilterExpression`, which MongoDB
	// rejects ("cannot mix"), so ensureIndexes throws before creating anything
	// else. Create the two indexes the tests rely on directly instead.
	await User.collection.createIndex({ username: 1 }, { unique: true });
	await User.collection.createIndex({ email: 1 }, { unique: true });
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

describe("createUserDB", () => {
	it("creates a user and bcrypt-hashes the password via the pre-save hook", async () => {
		const user = await makeUser(1);
		expect(user.email).toBe("user1@example.com");

		const raw = await User.findById(user._id).select("+password");
		expect(raw).not.toBeNull();
		expect(raw?.password).not.toBe("secret-password-123");
		expect(raw?.password).toMatch(/^\$2[aby]\$/);
		expect(await compare("secret-password-123", raw?.password ?? "")).toBe(
			true,
		);
	});

	it("lowercases and trims the email", async () => {
		const user = await makeUser(2, { email: "  MiXeD@ExAmPlE.CoM  " });
		expect(user.email).toBe("mixed@example.com");
	});

	it("returns null for an invalid email", async () => {
		const user = await createUserDB({
			payload: { ...userPayload(3), email: "not-an-email" },
		});
		expect(user).toBeNull();
		expect(await User.countDocuments()).toBe(0);
	});

	it("returns null on duplicate email", async () => {
		await makeUser(4);
		const dup = await createUserDB({
			payload: { ...userPayload(4), username: "other-username" },
		});
		expect(dup).toBeNull();
		expect(await User.countDocuments()).toBe(1);
	});

	it("returns null on duplicate username", async () => {
		await makeUser(5);
		const dup = await createUserDB({
			payload: { ...userPayload(5), email: "different5@example.com" },
		});
		expect(dup).toBeNull();
		expect(await User.countDocuments()).toBe(1);
	});
});

describe("updateUserDB", () => {
	it("updates fields and persists them", async () => {
		const user = await makeUser(1);
		const result = await updateUserDB({
			id: user._id.toString(),
			payload: { name: "Renamed" },
		});
		expect(result).not.toBeNull();
		const after = await User.findById(user._id);
		expect(after?.name).toBe("Renamed");
	});

	it("hashes a password passed through the findOneAndUpdate pre hook", async () => {
		const user = await makeUser(2);
		await updateUserDB({
			id: user._id.toString(),
			payload: { password: "brand-new-password" },
		});
		const raw = await User.findById(user._id).select("+password");
		expect(raw?.password).toMatch(/^\$2[aby]\$/);
		expect(await compare("brand-new-password", raw?.password ?? "")).toBe(
			true,
		);
	});

	it("returns null for an unknown id", async () => {
		expect(
			await updateUserDB({ id: unknownId(), payload: { name: "x" } }),
		).toBeNull();
	});
});

describe("updateUserRawDB", () => {
	it("applies an allowlisted $set path and returns the after-document", async () => {
		const user = await makeUser(1);
		const result = await updateUserRawDB({
			id: user._id.toString(),
			update: { $set: { "preferences.currency": "USD" } },
		});
		expect(result?.preferences?.currency).toBe("USD");
		const after = await User.findById(user._id);
		expect(after?.preferences?.currency).toBe("USD");
	});

	it("accepts an allowlisted top-level (non-operator) path", async () => {
		const user = await makeUser(2);
		const result = await updateUserRawDB({
			id: user._id.toString(),
			update: { currentOrganizationId: "org-123" },
		});
		expect(result?.currentOrganizationId).toBe("org-123");
	});

	it("rejects a path outside the allowlist and leaves the DB untouched", async () => {
		const spy = vi.spyOn(console, "error").mockImplementation(() => {});
		const user = await makeUser(3);
		const result = await updateUserRawDB({
			id: user._id.toString(),
			update: { $set: { email: "attacker@evil.com" } },
		});
		expect(result).toBeNull();
		const after = await User.findById(user._id);
		expect(after?.email).toBe("user3@example.com");
		spy.mockRestore();
	});

	it("rejects an unsupported operator", async () => {
		const spy = vi.spyOn(console, "error").mockImplementation(() => {});
		const user = await makeUser(4);
		const result = await updateUserRawDB({
			id: user._id.toString(),
			update: { $rename: { name: "fullName" } },
		});
		expect(result).toBeNull();
		spy.mockRestore();
	});

	it("rejects a non-object payload for a known operator", async () => {
		const spy = vi.spyOn(console, "error").mockImplementation(() => {});
		const user = await makeUser(5);
		const result = await updateUserRawDB({
			id: user._id.toString(),
			update: { $set: "garbage" as unknown as Record<string, unknown> },
		});
		expect(result).toBeNull();
		spy.mockRestore();
	});

	it("forwards arrayFilters for positional passkey updates under security.", async () => {
		const user = await makeUser(6, {
			security: {
				twoFactorEnabled: false,
				emailVerified: false,
				passkeys: [
					{
						credentialId: "cred-af-1",
						publicKey: "pk1",
						counter: 0,
						label: "Key 1",
						createdAt: new Date(),
					},
					{
						credentialId: "cred-af-2",
						publicKey: "pk2",
						counter: 0,
						label: "Key 2",
						createdAt: new Date(),
					},
				],
			},
		});
		const result = await updateUserRawDB({
			id: user._id.toString(),
			update: { $set: { "security.passkeys.$[p].counter": 42 } },
			arrayFilters: [{ "p.credentialId": "cred-af-2" }],
		});
		expect(result).not.toBeNull();
		const secrets = await getUserSecretsDB({ id: user._id.toString() });
		const counters = Object.fromEntries(
			(secrets?.passkeys ?? []).map((p) => [p.credentialId, p.counter]),
		);
		expect(counters["cred-af-1"]).toBe(0);
		expect(counters["cred-af-2"]).toBe(42);
	});

	it("returns null for an unknown id even with a valid update", async () => {
		const spy = vi.spyOn(console, "error").mockImplementation(() => {});
		const result = await updateUserRawDB({
			id: unknownId(),
			update: { $set: { "preferences.theme": "dark" } },
		});
		expect(result).toBeNull();
		spy.mockRestore();
	});
});

describe("findUserBySecurityTokenDB", () => {
	it("finds a user by password reset token with hidden fields selected", async () => {
		const user = await makeUser(1, {
			security: {
				twoFactorEnabled: false,
				emailVerified: false,
				passwordResetToken: "reset-tok-1",
				passwordResetExpires: new Date(Date.now() + 3600_000),
			},
		});
		const found = await findUserBySecurityTokenDB({
			field: "passwordResetToken",
			token: "reset-tok-1",
		});
		expect(found?._id.toString()).toBe(user._id.toString());
		expect(found?.security?.passwordResetToken).toBe("reset-tok-1");
		expect(found?.security?.passwordResetExpires).toBeInstanceOf(Date);
	});

	it("returns null for an unknown token", async () => {
		await makeUser(2);
		expect(
			await findUserBySecurityTokenDB({
				field: "emailVerificationToken",
				token: "nope",
			}),
		).toBeNull();
	});

	it("excludes soft-deleted users", async () => {
		const user = await makeUser(3, {
			security: {
				twoFactorEnabled: false,
				emailVerified: false,
				passwordResetToken: "reset-tok-3",
			},
		});
		await deleteUserDB({ id: user._id.toString() });
		expect(
			await findUserBySecurityTokenDB({
				field: "passwordResetToken",
				token: "reset-tok-3",
			}),
		).toBeNull();
	});
});

describe("getUserSecretsDB", () => {
	it("returns the hidden security material", async () => {
		const user = await makeUser(1, {
			security: {
				twoFactorEnabled: true,
				emailVerified: true,
				totpSecret: "totp-abc",
				pendingTotpSecret: "pending-def",
				recoveryCodes: ["r1", "r2"],
			},
		});
		const secrets = await getUserSecretsDB({ id: user._id.toString() });
		expect(secrets).toEqual(
			expect.objectContaining({
				totpSecret: "totp-abc",
				pendingTotpSecret: "pending-def",
				recoveryCodes: ["r1", "r2"],
			}),
		);
	});

	it("returns null for an unknown id", async () => {
		expect(await getUserSecretsDB({ id: unknownId() })).toBeNull();
	});
});

describe("getUserByPasskeyCredentialIdDB", () => {
	it("returns the user and the matching passkey", async () => {
		const user = await makeUser(1, {
			security: {
				twoFactorEnabled: false,
				emailVerified: false,
				passkeys: [
					{
						credentialId: "cred-xyz",
						publicKey: "public-key-material",
						counter: 7,
						label: "YubiKey",
						createdAt: new Date(),
					},
				],
			},
		});
		const result = await getUserByPasskeyCredentialIdDB({
			credentialId: "cred-xyz",
		});
		expect(result?.user.email).toBe(user.email);
		expect(result?.passkey.publicKey).toBe("public-key-material");
		expect(result?.passkey.counter).toBe(7);
	});

	it("returns null for an unknown credentialId", async () => {
		await makeUser(2);
		expect(
			await getUserByPasskeyCredentialIdDB({ credentialId: "missing" }),
		).toBeNull();
	});
});

describe("loginUserDB / refresh token trimming", () => {
	it("returns a JWT payload and stores the refresh token", async () => {
		const user = await makeUser(1);
		const payload = await loginUserDB({
			id: user._id.toString(),
			ip: "1.2.3.4",
		});
		expect(payload?.accessToken).toBeTruthy();
		expect(payload?.refreshToken).toBeTruthy();
		expect(payload?.userId).toBe(user._id.toString());

		const raw = await User.findById(user._id).select("+refreshTokens");
		expect(raw?.refreshTokens).toHaveLength(1);
		expect(raw?.refreshTokens?.[0].refreshToken).toBe(
			payload?.refreshToken,
		);
	});

	it("keeps at most 3 refresh tokens, dropping the oldest", async () => {
		const user = await makeUser(2);
		const tokens: string[] = [];
		for (let i = 0; i < 4; i++) {
			const p = await loginUserDB({ id: user._id.toString() });
			expect(p).not.toBeNull();
			// biome-ignore lint/style/noNonNullAssertion: asserted above
			tokens.push(p!.refreshToken);
		}
		const raw = await User.findById(user._id).select("+refreshTokens");
		const stored = (raw?.refreshTokens ?? []).map((t) => t.refreshToken);
		expect(stored).toHaveLength(3);
		expect(stored).not.toContain(tokens[0]);
		expect(stored).toEqual([tokens[1], tokens[2], tokens[3]]);
	});

	it("returns null for an unknown user", async () => {
		expect(await loginUserDB({ id: unknownId() })).toBeNull();
	});
});

describe("logoutUserDB", () => {
	it("pulls the given refresh token", async () => {
		const user = await makeUser(1);
		const p = await loginUserDB({ id: user._id.toString() });
		const ok = await logoutUserDB({
			id: user._id.toString(),
			// biome-ignore lint/style/noNonNullAssertion: login asserted
			refreshToken: p!.refreshToken,
		});
		expect(ok).toBe(true);
		const raw = await User.findById(user._id).select("+refreshTokens");
		expect(raw?.refreshTokens).toHaveLength(0);
	});

	it("returns false for an unknown user", async () => {
		expect(
			await logoutUserDB({ id: unknownId(), refreshToken: "whatever" }),
		).toBe(false);
	});
});

describe("reLoginUserWithRefreshTokenDB", () => {
	it("claims a valid token atomically and issues a new session", async () => {
		const user = await makeUser(1);
		const first = await loginUserDB({ id: user._id.toString() });
		const second = await reLoginUserWithRefreshTokenDB({
			id: user._id.toString(),
			// biome-ignore lint/style/noNonNullAssertion: login asserted
			refreshToken: first!.refreshToken,
			ip: "9.9.9.9",
		});
		expect(second?.accessToken).toBeTruthy();
		expect(second?.refreshToken).not.toBe(first?.refreshToken);

		const raw = await User.findById(user._id).select("+refreshTokens");
		const stored = (raw?.refreshTokens ?? []).map((t) => t.refreshToken);
		expect(stored).not.toContain(first?.refreshToken);
		expect(stored).toContain(second?.refreshToken);
	});

	it("rejects reuse of an already-claimed token", async () => {
		const user = await makeUser(2);
		const first = await loginUserDB({ id: user._id.toString() });
		await reLoginUserWithRefreshTokenDB({
			id: user._id.toString(),
			// biome-ignore lint/style/noNonNullAssertion: login asserted
			refreshToken: first!.refreshToken,
			ip: "1.1.1.1",
		});
		const replay = await reLoginUserWithRefreshTokenDB({
			id: user._id.toString(),
			// biome-ignore lint/style/noNonNullAssertion: login asserted
			refreshToken: first!.refreshToken,
			ip: "1.1.1.1",
		});
		expect(replay).toBeNull();
	});

	it("rejects an expired token", async () => {
		const user = await makeUser(3);
		await User.updateOne(
			{ _id: user._id },
			{
				$set: {
					refreshTokens: [
						{
							refreshToken: "expired-token",
							deadline: new Date(Date.now() - 60_000),
						},
					],
				},
			},
		);
		const result = await reLoginUserWithRefreshTokenDB({
			id: user._id.toString(),
			refreshToken: "expired-token",
			ip: "1.1.1.1",
		});
		expect(result).toBeNull();
	});
});

describe("session listing and revocation", () => {
	it("getUserSessionsDB returns sha256 session ids for each token", async () => {
		const user = await makeUser(1);
		const p1 = await loginUserDB({ id: user._id.toString() });
		const p2 = await loginUserDB({ id: user._id.toString() });
		const sessions = await getUserSessionsDB({ id: user._id.toString() });
		expect(sessions).toHaveLength(2);
		const expectedIds = [p1, p2].map((p) =>
			// biome-ignore lint/style/noNonNullAssertion: logins asserted
			createHash("sha256").update(p!.refreshToken).digest("hex"),
		);
		expect(sessions.map((s) => s.sessionId).sort()).toEqual(
			expectedIds.sort(),
		);
	});

	it("getUserSessionsDB returns [] for an unknown user", async () => {
		expect(await getUserSessionsDB({ id: unknownId() })).toEqual([]);
	});

	it("revokeUserSessionDB removes exactly the targeted session", async () => {
		const user = await makeUser(2);
		const p1 = await loginUserDB({ id: user._id.toString() });
		const p2 = await loginUserDB({ id: user._id.toString() });
		const sid1 = createHash("sha256")
			// biome-ignore lint/style/noNonNullAssertion: login asserted
			.update(p1!.refreshToken)
			.digest("hex");
		const ok = await revokeUserSessionDB({
			id: user._id.toString(),
			sessionId: sid1,
		});
		expect(ok).toBe(true);
		const raw = await User.findById(user._id).select("+refreshTokens");
		const stored = (raw?.refreshTokens ?? []).map((t) => t.refreshToken);
		expect(stored).toEqual([p2?.refreshToken]);
	});

	it("revokeUserSessionDB returns false for an unknown session id", async () => {
		const user = await makeUser(3);
		await loginUserDB({ id: user._id.toString() });
		expect(
			await revokeUserSessionDB({
				id: user._id.toString(),
				sessionId: "f".repeat(64),
			}),
		).toBe(false);
	});

	it("revokeAllUserSessionsDB keeps the excepted token", async () => {
		const user = await makeUser(4);
		await loginUserDB({ id: user._id.toString() });
		const keep = await loginUserDB({ id: user._id.toString() });
		await loginUserDB({ id: user._id.toString() });
		const ok = await revokeAllUserSessionsDB({
			id: user._id.toString(),
			exceptRefreshToken: keep?.refreshToken,
		});
		expect(ok).toBe(true);
		const raw = await User.findById(user._id).select("+refreshTokens");
		const stored = (raw?.refreshTokens ?? []).map((t) => t.refreshToken);
		expect(stored).toEqual([keep?.refreshToken]);
	});

	it("revokeAllUserSessionsDB without exception clears everything", async () => {
		const user = await makeUser(5);
		await loginUserDB({ id: user._id.toString() });
		await loginUserDB({ id: user._id.toString() });
		const ok = await revokeAllUserSessionsDB({ id: user._id.toString() });
		expect(ok).toBe(true);
		const raw = await User.findById(user._id).select("+refreshTokens");
		expect(raw?.refreshTokens).toHaveLength(0);
	});
});

describe("removeExpiredUsersTokensDB", () => {
	it("removes only expired tokens", async () => {
		const user = await makeUser(1);
		const future = new Date(Date.now() + 3600_000);
		await User.updateOne(
			{ _id: user._id },
			{
				$set: {
					refreshTokens: [
						{
							refreshToken: "stale",
							deadline: new Date(Date.now() - 3600_000),
						},
						{ refreshToken: "fresh", deadline: future },
					],
				},
			},
		);
		const ok = await removeExpiredUsersTokensDB();
		expect(ok).toBe(true);
		const raw = await User.findById(user._id).select("+refreshTokens");
		const stored = (raw?.refreshTokens ?? []).map((t) => t.refreshToken);
		expect(stored).toEqual(["fresh"]);
	});
});

describe("changePasswordDB", () => {
	it("hashes the new password and clears all refresh tokens", async () => {
		const user = await makeUser(1);
		await loginUserDB({ id: user._id.toString() });
		const ok = await changePasswordDB({
			id: user._id.toString(),
			password: "another-password-456",
		});
		expect(ok).toBe(true);
		const raw = await User.findById(user._id).select(
			"+password +refreshTokens",
		);
		expect(raw?.refreshTokens).toHaveLength(0);
		expect(await compare("another-password-456", raw?.password ?? "")).toBe(
			true,
		);
	});

	it("returns false for an unknown user", async () => {
		expect(
			await changePasswordDB({
				id: unknownId(),
				password: "irrelevant1",
			}),
		).toBe(false);
	});
});

describe("deleteUserDB (soft delete)", () => {
	it("marks the user deleted and hides them from aggregate reads", async () => {
		const user = await makeUser(1);
		const result = await deleteUserDB({ id: user._id.toString() });
		expect(result).not.toBeNull();

		const raw = await User.findById(user._id).select("+deleted");
		expect(raw?.deleted).toBe(true);
		expect(await getUserByIdDB({ id: user._id.toString() })).toBeNull();
		expect(await getUserByEmailDB({ email: user.email })).toBeNull();
	});

	it("returns null for an unknown id", async () => {
		expect(await deleteUserDB({ id: unknownId() })).toBeNull();
	});
});

describe("getUserByIdDB", () => {
	it("returns the user with a string id and without secret fields", async () => {
		const user = await makeUser(1);
		const found = await getUserByIdDB({ id: user._id.toString() });
		expect(found).not.toBeNull();
		expect((found as unknown as { id: string }).id).toBe(
			user._id.toString(),
		);
		expect(
			(found as unknown as Record<string, unknown>).password,
		).toBeUndefined();
		expect(
			(found as unknown as Record<string, unknown>).refreshTokens,
		).toBeUndefined();
		expect(found?.security?.totpSecret).toBeUndefined();
	});

	it("returns null for an unknown id", async () => {
		expect(await getUserByIdDB({ id: unknownId() })).toBeNull();
	});
});

describe("getUserByEmailDB", () => {
	it("normalizes case and whitespace before matching", async () => {
		const user = await makeUser(1, { email: "findme@example.com" });
		const found = await getUserByEmailDB({
			email: "  FINDME@EXAMPLE.COM ",
		});
		expect(found?.email).toBe(user.email);
	});

	it("returns null for an empty email", async () => {
		await makeUser(2);
		expect(await getUserByEmailDB({ email: "   " })).toBeNull();
	});

	it("returns null for an unknown email", async () => {
		expect(
			await getUserByEmailDB({ email: "ghost@example.com" }),
		).toBeNull();
	});
});

describe("getUsersByIdsDB", () => {
	it("returns matching users with offset/limit and excludes soft-deleted", async () => {
		const u1 = await makeUser(1);
		const u2 = await makeUser(2);
		const u3 = await makeUser(3);
		await deleteUserDB({ id: u3._id.toString() });

		const ids = [u1, u2, u3].map((u) => u._id.toString());
		const all = await getUsersByIdsDB({ ids, offset: 0, limit: 10 });
		expect(all).toHaveLength(2);
		expect(all.map((u) => u.email).sort()).toEqual([u1.email, u2.email]);

		const paged = await getUsersByIdsDB({ ids, offset: 1, limit: 10 });
		expect(paged).toHaveLength(1);
	});

	it("returns [] when nothing matches", async () => {
		expect(
			await getUsersByIdsDB({ ids: [unknownId()], offset: 0, limit: 10 }),
		).toEqual([]);
	});

	it("returns [] when the aggregate throws (catch path)", async () => {
		vi.spyOn(User, "aggregate").mockRejectedValueOnce(new Error("boom"));
		expect(
			await getUsersByIdsDB({ ids: [unknownId()], offset: 0, limit: 10 }),
		).toEqual([]);
	});
});

describe("getUsersByEmailsDB", () => {
	it("matches exact emails, honors limit, and excludes soft-deleted", async () => {
		const u1 = await makeUser(1);
		const u2 = await makeUser(2);
		const u3 = await makeUser(3);
		await deleteUserDB({ id: u3._id.toString() });

		const emails = [u1.email, u2.email, u3.email];
		const all = await getUsersByEmailsDB({ emails, offset: 0, limit: 10 });
		expect(all.map((u) => u.email).sort()).toEqual([u1.email, u2.email]);

		const limited = await getUsersByEmailsDB({
			emails,
			offset: 0,
			limit: 1,
		});
		expect(limited).toHaveLength(1);
	});

	it("returns [] when the aggregate throws (catch path)", async () => {
		vi.spyOn(User, "aggregate").mockRejectedValueOnce(new Error("boom"));
		expect(
			await getUsersByEmailsDB({
				emails: ["nobody@example.com"],
				offset: 0,
				limit: 10,
			}),
		).toEqual([]);
	});
});

describe("getUserByEmailWithPasswordDB", () => {
	it("returns the user including the bcrypt hash", async () => {
		const user = await makeUser(1);
		const found = await getUserByEmailWithPasswordDB({
			email: " USER1@EXAMPLE.COM ",
		});
		expect((found as { id: string } | null)?.id).toBe(user._id.toString());
		expect(found?.password).toMatch(/^\$2[aby]\$/);
	});

	it("returns null for soft-deleted users", async () => {
		const user = await makeUser(2);
		await deleteUserDB({ id: user._id.toString() });
		expect(
			await getUserByEmailWithPasswordDB({ email: user.email }),
		).toBeNull();
	});

	it("returns null for an unknown email", async () => {
		expect(
			await getUserByEmailWithPasswordDB({ email: "nobody@example.com" }),
		).toBeNull();
	});
});

describe("getUserByIdWithPasswordDB", () => {
	it("returns the user including the bcrypt hash", async () => {
		const user = await makeUser(1);
		const found = await getUserByIdWithPasswordDB({
			id: user._id.toString(),
		});
		expect((found as { id: string } | null)?.id).toBe(user._id.toString());
		expect(found?.password).toMatch(/^\$2[aby]\$/);
	});

	it("returns null for an unknown id", async () => {
		expect(await getUserByIdWithPasswordDB({ id: unknownId() })).toBeNull();
	});

	it("returns null for a soft-deleted user (cannot change password)", async () => {
		const user = await makeUser(1);
		await deleteUserDB({ id: user._id.toString() });
		expect(
			await getUserByIdWithPasswordDB({ id: user._id.toString() }),
		).toBeNull();
	});
});

describe("user document methods", () => {
	it("hashPassword returns a verifiable bcrypt hash", async () => {
		const user = await makeUser(1);
		const doc = await User.findById(user._id);
		const hashed = await doc?.hashPassword("check-me-789");
		expect(hashed).toMatch(/^\$2[aby]\$/);
		expect(await compare("check-me-789", hashed ?? "")).toBe(true);
	});
});

describe("generateAuthToken (users/utils)", () => {
	it("produces verifiable access and refresh tokens", async () => {
		const result = await generateAuthToken({
			userId: "abc123",
			ip: "5.6.7.8",
			shouldRegenerateRefreshToken: true,
		});
		expect(result).not.toBeNull();
		expect(result?.refreshToken).toBeTruthy();
		const decoded = verify(
			result?.accessToken ?? "",
			process.env.JWT_ACCESS_TOKEN_SECRET ?? "",
		) as { data: { userId: string; ip: string } };
		expect(decoded.data.userId).toBe("abc123");
		expect(decoded.data.ip).toBe("5.6.7.8");
		const decodedRefresh = verify(
			result?.refreshToken ?? "",
			process.env.JWT_REFRESH_TOKEN_SECRET ?? "",
		) as { data: { userId: string } };
		expect(decodedRefresh.data.userId).toBe("abc123");
	});

	it("returns an empty refresh token when regeneration is off", async () => {
		const result = await generateAuthToken({
			userId: "abc123",
			ip: "",
			shouldRegenerateRefreshToken: false,
		});
		expect(result?.refreshToken).toBe("");
		expect(result?.accessToken).toBeTruthy();
	});
});
