import { sign } from "jsonwebtoken";
import { describe, expect, it } from "vitest";
import decodeJwtToken from "@/server/constants/decodeJwtToken";
import { ErrInvalidAction } from "@/server/constants/errors";

const ACCESS_SECRET = process.env.JWT_ACCESS_TOKEN_SECRET as string;
const REFRESH_SECRET = process.env.JWT_REFRESH_TOKEN_SECRET as string;

function payload(overrides: Record<string, unknown> = {}) {
	const now = Date.now();
	return {
		userId: "user-123",
		ip: "203.0.113.9",
		date: new Date(now).toISOString(),
		expiresIn: new Date(now + 60 * 60 * 1000).toISOString(),
		refreshTokenExpiresIn: new Date(now + 30 * 24 * 60 * 60 * 1000).toISOString(),
		...overrides,
	};
}

describe("decodeJwtToken — access token path", () => {
	it("round-trips a valid access token", async () => {
		const token = sign({ data: payload() }, ACCESS_SECRET, {
			algorithm: "HS256",
		});
		const result = await decodeJwtToken({ accessToken: token });
		expect(result).not.toBeNull();
		expect(result?.userId).toBe("user-123");
		expect(result?.ip).toBe("203.0.113.9");
		expect(result?.date).toBeInstanceOf(Date);
		expect(result?.expiresIn).toBeInstanceOf(Date);
		// Falls back to the presented token when the payload carries none.
		expect(result?.accessToken).toBe(token);
	});

	it("rejects an access token whose payload expiresIn is in the past", async () => {
		const token = sign(
			{
				data: payload({
					expiresIn: new Date(Date.now() - 1000).toISOString(),
				}),
			},
			ACCESS_SECRET,
			{ algorithm: "HS256" },
		);
		await expect(decodeJwtToken({ accessToken: token })).rejects.toBe(
			ErrInvalidAction,
		);
	});

	it("rejects an access token signed with the wrong secret", async () => {
		const token = sign({ data: payload() }, "attacker-secret", {
			algorithm: "HS256",
		});
		await expect(decodeJwtToken({ accessToken: token })).rejects.toBe(
			ErrInvalidAction,
		);
	});

	it("rejects an access token signed with the refresh secret (key separation)", async () => {
		const token = sign({ data: payload() }, REFRESH_SECRET, {
			algorithm: "HS256",
		});
		await expect(decodeJwtToken({ accessToken: token })).rejects.toBe(
			ErrInvalidAction,
		);
	});

	it("rejects tokens signed with a non-pinned algorithm (HS512)", async () => {
		const token = sign({ data: payload() }, ACCESS_SECRET, {
			algorithm: "HS512",
		});
		await expect(decodeJwtToken({ accessToken: token })).rejects.toBe(
			ErrInvalidAction,
		);
	});

	it("rejects a token expired at the JWT layer (exp claim)", async () => {
		const token = sign({ data: payload() }, ACCESS_SECRET, {
			algorithm: "HS256",
			expiresIn: -10,
		});
		await expect(decodeJwtToken({ accessToken: token })).rejects.toBe(
			ErrInvalidAction,
		);
	});

	it("rejects tampered tokens", async () => {
		const token = sign({ data: payload() }, ACCESS_SECRET, {
			algorithm: "HS256",
		});
		const [h, p, s] = token.split(".");
		const forgedPayload = Buffer.from(
			JSON.stringify({ data: payload({ userId: "admin" }) }),
		).toString("base64url");
		await expect(
			decodeJwtToken({ accessToken: `${h}.${forgedPayload}.${s}` }),
		).rejects.toBe(ErrInvalidAction);
		expect(p).toBeTruthy();
	});

	it("rejects garbage and empty inputs", async () => {
		await expect(decodeJwtToken({ accessToken: "not.a.jwt" })).rejects.toBe(
			ErrInvalidAction,
		);
		await expect(decodeJwtToken({})).rejects.toBe(ErrInvalidAction);
	});

	it("rejects a token whose payload has no data envelope", async () => {
		const token = sign({ userId: "user-123" }, ACCESS_SECRET, {
			algorithm: "HS256",
		});
		await expect(decodeJwtToken({ accessToken: token })).rejects.toBe(
			ErrInvalidAction,
		);
	});
});

describe("decodeJwtToken — refresh token path", () => {
	it("verifies a refresh token against the refresh secret", async () => {
		const token = sign({ data: payload() }, REFRESH_SECRET, {
			algorithm: "HS256",
		});
		const result = await decodeJwtToken({ refreshToken: token });
		expect(result?.userId).toBe("user-123");
		expect(result?.refreshToken).toBe(token);
		expect(result?.refreshTokenExpiresIn).toBeInstanceOf(Date);
	});

	it("does not apply the access-token expiresIn check on the refresh path", async () => {
		// expiresIn (the *access* token expiry inside the payload) is stale,
		// but a refresh-token verification must still succeed.
		const token = sign(
			{
				data: payload({
					expiresIn: new Date(Date.now() - 1000).toISOString(),
				}),
			},
			REFRESH_SECRET,
			{ algorithm: "HS256" },
		);
		const result = await decodeJwtToken({ refreshToken: token });
		expect(result?.userId).toBe("user-123");
	});

	it("rejects a refresh token signed with the access secret", async () => {
		const token = sign({ data: payload() }, ACCESS_SECRET, {
			algorithm: "HS256",
		});
		await expect(decodeJwtToken({ refreshToken: token })).rejects.toBe(
			ErrInvalidAction,
		);
	});

	it("prefers the access-token branch when both tokens are supplied", async () => {
		// accessToken present -> verified with the ACCESS secret; a refresh-
		// signed token in that slot must fail even with a valid refreshToken.
		const refreshSigned = sign({ data: payload() }, REFRESH_SECRET, {
			algorithm: "HS256",
		});
		await expect(
			decodeJwtToken({
				accessToken: refreshSigned,
				refreshToken: refreshSigned,
			}),
		).rejects.toBe(ErrInvalidAction);
	});
});
