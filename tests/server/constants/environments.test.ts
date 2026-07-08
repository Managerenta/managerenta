import { afterEach, describe, expect, it, vi } from "vitest";
import * as env from "@/server/constants/environments";

describe("environments (values under the vitest setup)", () => {
	it("uses the per-worker scratch database, never the dev database", () => {
		expect(env.DB_NAME).toMatch(/^managerenta-vitest-/);
		expect(env.DB_NAME).not.toBe("managerenta");
	});

	it("exposes the JWT test secrets from the environment", () => {
		expect(env.JWT_ACCESS_TOKEN_SECRET).toBe(
			process.env.JWT_ACCESS_TOKEN_SECRET,
		);
		expect(env.JWT_REFRESH_TOKEN_SECRET).toBe(
			process.env.JWT_REFRESH_TOKEN_SECRET,
		);
		expect(env.JWT_ACCESS_TOKEN_SECRET).not.toBe(
			env.JWT_REFRESH_TOKEN_SECRET,
		);
	});

	it("computes fixed constants", () => {
		expect(env.MAX_LIMIT).toBe(50);
		expect(env.ACCESS_TOKEN_MAX_AGE_SECONDS).toBe(24 * 60 * 60);
		expect(env.REFRESH_TOKEN_MAX_AGE_SECONDS).toBe(30 * 24 * 60 * 60);
	});

	it("parses TRUSTED_PROXY='0' as false", () => {
		expect(env.TRUSTED_PROXY).toBe(false);
	});

	it("reflects the S3/cookie test configuration", () => {
		expect(env.S3_BUCKET).toBe("vitest-fake-bucket");
		expect(env.COOKIE_DOMAIN).toBe("localhost");
		expect(env.NODE_ENV).toBe("test");
	});
});

describe("environments (defaults via fresh import)", () => {
	afterEach(() => {
		vi.unstubAllEnvs();
		vi.resetModules();
	});

	async function freshImport() {
		vi.resetModules();
		return import("@/server/constants/environments");
	}

	it("defaults PORT to 8080 when unset", async () => {
		vi.stubEnv("PORT", undefined);
		const mod = await freshImport();
		expect(mod.PORT).toBe("8080");
	});

	it("respects an explicit PORT", async () => {
		vi.stubEnv("PORT", "9999");
		const mod = await freshImport();
		expect(mod.PORT).toBe("9999");
	});

	it("parses TRUSTED_PROXY='1' as true and anything else as false", async () => {
		vi.stubEnv("TRUSTED_PROXY", "1");
		expect((await freshImport()).TRUSTED_PROXY).toBe(true);

		vi.stubEnv("TRUSTED_PROXY", "true");
		expect((await freshImport()).TRUSTED_PROXY).toBe(false);

		vi.stubEnv("TRUSTED_PROXY", undefined);
		expect((await freshImport()).TRUSTED_PROXY).toBe(false);
	});

	it("defaults string configs to the empty string when unset", async () => {
		vi.stubEnv("COOKIE_DOMAIN", undefined);
		vi.stubEnv("CLOUDFRONT_CDN_URL", undefined);
		vi.stubEnv("METRICS_TOKEN", undefined);
		const mod = await freshImport();
		expect(mod.COOKIE_DOMAIN).toBe("");
		expect(mod.CLOUDFRONT_CDN_URL).toBe("");
		expect(mod.METRICS_TOKEN).toBe("");
	});

	it("defaults every store/S3/JWT config to '' and NODE_ENV to development when unset", async () => {
		for (const name of [
			"MONGODB_URI",
			"DB_NAME",
			"REDIS_URI",
			"S3_REGION",
			"S3_BUCKET",
			"S3_ACCESS_KEY",
			"S3_SECRET_ACCESS_KEY",
			"JWT_ACCESS_TOKEN_SECRET",
			"JWT_REFRESH_TOKEN_SECRET",
			"NODE_ENV",
		]) {
			vi.stubEnv(name, undefined);
		}
		const mod = await freshImport();
		expect(mod.MONGODB_URI).toBe("");
		expect(mod.DB_NAME).toBe("");
		expect(mod.REDIS_URI).toBe("");
		expect(mod.S3_REGION).toBe("");
		expect(mod.S3_BUCKET).toBe("");
		expect(mod.S3_ACCESS_KEY).toBe("");
		expect(mod.S3_SECRET_ACCESS_KEY).toBe("");
		expect(mod.JWT_ACCESS_TOKEN_SECRET).toBe("");
		expect(mod.JWT_REFRESH_TOKEN_SECRET).toBe("");
		expect(mod.NODE_ENV).toBe("development");
	});
});
