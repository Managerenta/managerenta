import { afterEach, describe, expect, it, vi } from "vitest";
import { getClientIp } from "@/server/lib/clientIp";

function req(headers: Record<string, string> = {}): Request {
	return new Request("http://localhost:3000/api/test", { headers });
}

afterEach(() => {
	vi.unstubAllEnvs();
	vi.restoreAllMocks();
});

describe("getClientIp — untrusted proxy (TRUSTED_PROXY=0, the default)", () => {
	it("prefers cf-connecting-ip over everything else", () => {
		expect(
			getClientIp(
				req({
					"cf-connecting-ip": " 1.1.1.1 ",
					"x-real-ip": "2.2.2.2",
					"x-forwarded-for": "3.3.3.3, 4.4.4.4",
				}),
			),
		).toBe("1.1.1.1");
	});

	it("falls back to x-real-ip before x-forwarded-for", () => {
		expect(
			getClientIp(
				req({
					"x-real-ip": "2.2.2.2",
					"x-forwarded-for": "3.3.3.3, 4.4.4.4",
				}),
			),
		).toBe("2.2.2.2");
	});

	it("takes the FIRST x-forwarded-for hop when the proxy is untrusted", () => {
		expect(
			getClientIp(req({ "x-forwarded-for": "3.3.3.3, 4.4.4.4, 5.5.5.5" })),
		).toBe("3.3.3.3");
	});

	it("trims whitespace and skips empty XFF entries", () => {
		expect(
			getClientIp(req({ "x-forwarded-for": " ,  , 6.6.6.6 , 7.7.7.7" })),
		).toBe("6.6.6.6");
	});

	it("returns unknown for a garbage XFF made only of separators", () => {
		expect(getClientIp(req({ "x-forwarded-for": " , ,, " }))).toBe("unknown");
	});

	it("returns unknown when no forwarding headers exist", () => {
		expect(getClientIp(req())).toBe("unknown");
	});

	it("ignores whitespace-only cf-connecting-ip / x-real-ip values", () => {
		expect(
			getClientIp(
				req({
					"cf-connecting-ip": "   ",
					"x-real-ip": "\t",
					"x-forwarded-for": "8.8.8.8",
				}),
			),
		).toBe("8.8.8.8");
	});
});

describe("getClientIp — trusted proxy (TRUSTED_PROXY=1)", () => {
	async function importTrusted(): Promise<typeof getClientIp> {
		vi.stubEnv("TRUSTED_PROXY", "1");
		vi.resetModules();
		const mod = await import("@/server/lib/clientIp");
		return mod.getClientIp;
	}

	it("takes the LAST x-forwarded-for hop (closest to the edge)", async () => {
		const trustedGetClientIp = await importTrusted();
		expect(
			trustedGetClientIp(
				req({ "x-forwarded-for": "3.3.3.3, 4.4.4.4, 5.5.5.5" }),
			),
		).toBe("5.5.5.5");
	});

	it("still prefers the single-value edge headers", async () => {
		const trustedGetClientIp = await importTrusted();
		expect(
			trustedGetClientIp(
				req({
					"x-real-ip": "2.2.2.2",
					"x-forwarded-for": "3.3.3.3, 4.4.4.4",
				}),
			),
		).toBe("2.2.2.2");
	});
});

describe("getClientIp — production misconfiguration warning", () => {
	it("warns exactly once when honoring XFF in production without TRUSTED_PROXY", async () => {
		vi.stubEnv("NODE_ENV", "production");
		vi.stubEnv("TRUSTED_PROXY", "0");
		vi.resetModules();
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		const { getClientIp: prodGetClientIp } = await import(
			"@/server/lib/clientIp"
		);

		prodGetClientIp(req({ "x-forwarded-for": "3.3.3.3" }));
		prodGetClientIp(req({ "x-forwarded-for": "4.4.4.4" }));

		expect(warn).toHaveBeenCalledTimes(1);
		expect(warn.mock.calls[0]?.[0]).toContain("TRUSTED_PROXY");
	});

	it("does not warn outside production", () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		getClientIp(req({ "x-forwarded-for": "3.3.3.3" }));
		expect(warn).not.toHaveBeenCalled();
	});
});
