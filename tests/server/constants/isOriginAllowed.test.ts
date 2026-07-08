import { afterEach, describe, expect, it, vi } from "vitest";
import isOriginAllowed from "@/server/constants/isOriginAllowed";
import clientAppURLs from "@/server/constants/clientAppURLs";

// NODE_ENV is "test" under vitest, so the module's non-production branch
// (private-network allowance) is active for the statically imported copy.

describe("isOriginAllowed (non-production)", () => {
	it("rejects a missing or empty origin", () => {
		expect(isOriginAllowed(undefined)).toBe(false);
		expect(isOriginAllowed("")).toBe(false);
	});

	it("allows whitelisted hosts", () => {
		expect(isOriginAllowed("http://localhost")).toBe(true);
		expect(isOriginAllowed("http://localhost:3000")).toBe(true);
		expect(isOriginAllowed("https://managerenta.com")).toBe(true);
	});

	it("collapses subdomains, www and ports to the root domain", () => {
		expect(isOriginAllowed("https://app.managerenta.com")).toBe(true);
		expect(isOriginAllowed("https://www.managerenta.com")).toBe(true);
		expect(isOriginAllowed("https://managerenta.com:8443")).toBe(true);
	});

	it("rejects unrelated origins", () => {
		expect(isOriginAllowed("https://evil.com")).toBe(false);
		expect(isOriginAllowed("https://google.com")).toBe(false);
	});

	it("is not fooled by whitelisted names embedded in attacker domains", () => {
		expect(isOriginAllowed("https://managerenta.com.evil.com")).toBe(false);
		expect(isOriginAllowed("https://notmanagerenta.com.attacker.io")).toBe(
			false,
		);
	});

	it("rejects a lookalike suffix domain (exact root-domain match required)", () => {
		expect(isOriginAllowed("https://evilmanagerenta.com")).toBe(false);
	});

	it("allows private-network IPs for mobile testing in dev", () => {
		expect(isOriginAllowed("http://192.168.1.5:3000")).toBe(true);
		expect(isOriginAllowed("http://10.0.0.1")).toBe(true);
		expect(isOriginAllowed("http://172.16.0.1:8080")).toBe(true);
		expect(isOriginAllowed("http://172.31.255.255")).toBe(true);
	});

	it("rejects public IPs and near-miss ranges", () => {
		expect(isOriginAllowed("http://11.0.0.1")).toBe(false);
		expect(isOriginAllowed("http://172.32.0.1")).toBe(false);
		expect(isOriginAllowed("http://172.15.0.1")).toBe(false);
		expect(isOriginAllowed("http://8.8.8.8")).toBe(false);
	});
});

describe("isOriginAllowed (production)", () => {
	afterEach(() => {
		vi.unstubAllEnvs();
		vi.resetModules();
	});

	async function loadProduction() {
		vi.resetModules();
		vi.stubEnv("NODE_ENV", "production");
		const mod = await import("@/server/constants/isOriginAllowed");
		return mod.default;
	}

	it("rejects private-network IPs when NODE_ENV=production", async () => {
		const prodIsOriginAllowed = await loadProduction();
		expect(prodIsOriginAllowed("http://192.168.1.5:3000")).toBe(false);
		expect(prodIsOriginAllowed("http://10.0.0.1")).toBe(false);
		expect(prodIsOriginAllowed("http://172.16.0.1")).toBe(false);
	});

	it("still allows the whitelist in production", async () => {
		const prodIsOriginAllowed = await loadProduction();
		expect(prodIsOriginAllowed("https://managerenta.com")).toBe(true);
		expect(prodIsOriginAllowed("https://evil.com")).toBe(false);
	});
});

describe("clientAppURLs", () => {
	it("stays a narrow whitelist of localhost and the product domain", () => {
		expect(clientAppURLs.map((i) => i.url)).toEqual([
			"localhost",
			"managerenta.com",
		]);
	});
});
