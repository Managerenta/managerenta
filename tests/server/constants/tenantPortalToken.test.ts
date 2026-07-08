import { describe, expect, it } from "vitest";
import { sign } from "jsonwebtoken";
import {
	signTenantPortalToken,
	verifyTenantPortalToken,
} from "../../../src/server/constants/tenantPortalToken";

describe("tenant portal token", () => {
	const payload = { tenantId: "tenant-1", ownerId: "owner-1" };

	it("round-trips a valid payload", () => {
		const token = signTenantPortalToken(payload);
		expect(verifyTenantPortalToken(token)).toEqual(payload);
	});

	it("rejects garbage tokens", () => {
		expect(verifyTenantPortalToken("not-a-jwt")).toBeNull();
		expect(verifyTenantPortalToken("")).toBeNull();
	});

	it("rejects tokens signed with the raw access-token secret (domain separation)", () => {
		// A forged token signed with the base JWT secret must not validate:
		// the portal secret is domain-separated via sha256(secret:audience).
		const forged = sign(
			{ data: payload },
			process.env.JWT_ACCESS_TOKEN_SECRET as string,
			{ algorithm: "HS256", audience: "tenant-portal", expiresIn: 3600 },
		);
		expect(verifyTenantPortalToken(forged)).toBeNull();
	});

	it("rejects tokens with a different audience", () => {
		const token = signTenantPortalToken(payload);
		// verify enforces audience; a token for another audience fails even
		// with the right key. Simulate by signing with the portal derivation
		// but wrong audience string.
		const { createHash } = require("node:crypto");
		const wrongAud = sign(
			{ data: payload },
			createHash("sha256")
				.update(`${process.env.JWT_ACCESS_TOKEN_SECRET}:tenant-portal`)
				.digest("hex"),
			{ algorithm: "HS256", audience: "other-audience", expiresIn: 3600 },
		);
		expect(verifyTenantPortalToken(wrongAud)).toBeNull();
		expect(verifyTenantPortalToken(token)).not.toBeNull();
	});

	it("rejects payloads missing tenantId or ownerId", () => {
		const { createHash } = require("node:crypto");
		const secret = createHash("sha256")
			.update(`${process.env.JWT_ACCESS_TOKEN_SECRET}:tenant-portal`)
			.digest("hex");
		const missing = sign({ data: { tenantId: "only" } }, secret, {
			algorithm: "HS256",
			audience: "tenant-portal",
			expiresIn: 3600,
		});
		expect(verifyTenantPortalToken(missing)).toBeNull();
	});
});
