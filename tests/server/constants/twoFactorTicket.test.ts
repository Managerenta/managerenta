import { createHash } from "node:crypto";
import { sign, decode } from "jsonwebtoken";
import { describe, expect, it } from "vitest";
import {
	signTwoFactorTicket,
	verifyTwoFactorTicket,
} from "@/server/constants/twoFactorTicket";

const derivedSecret = createHash("sha256")
	.update(`${process.env.JWT_ACCESS_TOKEN_SECRET}:2fa-challenge`)
	.digest("hex");

describe("twoFactorTicket", () => {
	it("round-trips: sign then verify returns userId and a nonce", () => {
		const ticket = signTwoFactorTicket("user-42");
		const payload = verifyTwoFactorTicket(ticket);
		expect(payload).not.toBeNull();
		expect(payload?.userId).toBe("user-42");
		expect(payload?.nonce).toMatch(/^[0-9a-f]{32}$/);
	});

	it("issues a fresh nonce per ticket (single-use identity)", () => {
		const a = verifyTwoFactorTicket(signTwoFactorTicket("u"));
		const b = verifyTwoFactorTicket(signTwoFactorTicket("u"));
		expect(a?.nonce).not.toBe(b?.nonce);
	});

	it("embeds the 2fa-challenge audience and a ~5 minute expiry", () => {
		const ticket = signTwoFactorTicket("user-42");
		const claims = decode(ticket) as {
			aud: string;
			exp: number;
			iat: number;
		};
		expect(claims.aud).toBe("2fa-challenge");
		expect(claims.exp - claims.iat).toBe(5 * 60);
	});

	it("rejects garbage tokens", () => {
		expect(verifyTwoFactorTicket("not-a-jwt")).toBeNull();
		expect(verifyTwoFactorTicket("")).toBeNull();
	});

	it("rejects tickets forged with the raw access-token secret (domain separation)", () => {
		const forged = sign(
			{ data: { userId: "user-42", nonce: "aa".repeat(16) } },
			process.env.JWT_ACCESS_TOKEN_SECRET as string,
			{ algorithm: "HS256", audience: "2fa-challenge", expiresIn: 300 },
		);
		expect(verifyTwoFactorTicket(forged)).toBeNull();
	});

	it("rejects tickets with the wrong audience even when correctly keyed", () => {
		const wrongAud = sign(
			{ data: { userId: "user-42", nonce: "bb".repeat(16) } },
			derivedSecret,
			{ algorithm: "HS256", audience: "not-2fa", expiresIn: 300 },
		);
		expect(verifyTwoFactorTicket(wrongAud)).toBeNull();
	});

	it("rejects expired tickets", () => {
		const expired = sign(
			{ data: { userId: "user-42", nonce: "cc".repeat(16) } },
			derivedSecret,
			{ algorithm: "HS256", audience: "2fa-challenge", expiresIn: -1 },
		);
		expect(verifyTwoFactorTicket(expired)).toBeNull();
	});

	it("rejects payloads without a userId", () => {
		const missing = sign({ data: { nonce: "dd".repeat(16) } }, derivedSecret, {
			algorithm: "HS256",
			audience: "2fa-challenge",
			expiresIn: 300,
		});
		expect(verifyTwoFactorTicket(missing)).toBeNull();
	});
});
