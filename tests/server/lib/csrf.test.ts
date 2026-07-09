import { describe, expect, it } from "vitest";
import { csrfReject } from "@/server/lib/csrf";

function req(method: string, headers: Record<string, string> = {}): Request {
	return new Request("http://localhost:3000/api/test", { method, headers });
}

describe("csrfReject", () => {
	describe("safe methods", () => {
		it.each([
			"GET",
			"HEAD",
			"OPTIONS",
		])("allows %s even with a hostile origin", (method) => {
			expect(
				csrfReject(req(method, { origin: "https://evil.com" })),
			).toBeNull();
		});

		it("allows GET with no origin signal at all", () => {
			expect(csrfReject(req("GET"))).toBeNull();
		});
	});

	describe("unsafe methods with Origin header", () => {
		it.each([
			"http://localhost:3000",
			"https://managerenta.com",
			"https://app.managerenta.com",
			"https://www.managerenta.com",
		])("allows POST from whitelisted origin %s", (origin) => {
			expect(csrfReject(req("POST", { origin }))).toBeNull();
		});

		it("allows local-network origins outside production (mobile dev testing)", () => {
			// NODE_ENV is "test" here, so the dev-only LAN allowance applies.
			expect(
				csrfReject(req("POST", { origin: "http://192.168.1.5:3000" })),
			).toBeNull();
		});

		it.each([
			"POST",
			"PUT",
			"PATCH",
			"DELETE",
		])("rejects %s from a non-whitelisted origin", (method) => {
			expect(
				csrfReject(req(method, { origin: "https://evil.com" })),
			).toBe("Origin not allowed");
		});

		it("rejects a lookalike domain that only embeds the real one", () => {
			expect(
				csrfReject(
					req("POST", { origin: "https://managerenta.com.evil.com" }),
				),
			).toBe("Origin not allowed");
		});

		it('rejects the opaque "null" origin (sandboxed iframe)', () => {
			expect(csrfReject(req("POST", { origin: "null" }))).toBe(
				"Origin not allowed",
			);
		});

		it("prefers Origin over Referer: bad origin loses even with a good referer", () => {
			expect(
				csrfReject(
					req("POST", {
						origin: "https://evil.com",
						referer: "https://managerenta.com/dashboard",
					}),
				),
			).toBe("Origin not allowed");
		});
	});

	describe("unsafe methods falling back to Referer", () => {
		it("allows POST when Referer resolves to a whitelisted origin", () => {
			expect(
				csrfReject(
					req("POST", {
						referer: "https://managerenta.com/some/page?x=1",
					}),
				),
			).toBeNull();
		});

		it("rejects POST when Referer is a foreign origin", () => {
			expect(
				csrfReject(req("POST", { referer: "https://evil.com/attack" })),
			).toBe("Referer not allowed");
		});

		it("rejects a malformed Referer", () => {
			expect(
				csrfReject(req("POST", { referer: "not a url at all" })),
			).toBe("Malformed Referer");
		});
	});

	it("rejects unsafe requests with neither Origin nor Referer", () => {
		expect(csrfReject(req("POST"))).toBe("Missing Origin and Referer");
		expect(csrfReject(req("DELETE"))).toBe("Missing Origin and Referer");
	});
});
