import { describe, expect, it } from "vitest";
import {
	buildOtpAuthUrl,
	generateOtpAuthQrCode,
	generateRecoveryCodes,
	generateTotpSecret,
	generateTotpToken,
	verifyTotpToken,
} from "@/server/constants/totp";

// RFC 4226 appendix D test secret: ASCII "12345678901234567890" in base32.
const RFC_SECRET = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";
// RFC 4226 6-digit HOTP values for counters 0..9.
const RFC_HOTP = [
	"755224",
	"287082",
	"359152",
	"969429",
	"338314",
	"254676",
	"287922",
	"162583",
	"399871",
	"520489",
];

describe("generateTotpToken (RFC 4226 vectors, 30s steps)", () => {
	it("matches the RFC HOTP vectors at each 30-second counter", () => {
		for (let counter = 0; counter < RFC_HOTP.length; counter++) {
			const now = counter * 30 * 1000;
			expect(generateTotpToken(RFC_SECRET, now)).toBe(RFC_HOTP[counter]);
		}
	});

	it("keeps the same code within one 30-second step", () => {
		expect(generateTotpToken(RFC_SECRET, 0)).toBe("755224");
		expect(generateTotpToken(RFC_SECRET, 29_999)).toBe("755224");
		expect(generateTotpToken(RFC_SECRET, 30_000)).toBe("287082");
	});

	it("always returns 6 digits (zero-padded)", () => {
		const token = generateTotpToken(RFC_SECRET, 123_456_789_000);
		expect(token).toMatch(/^\d{6}$/);
	});

	it("skips non-base32 characters and trailing padding in the secret", () => {
		const dashed = "GEZD-GNBV-GY3T-QOJQ-GEZD-GNBV-GY3T-QOJQ";
		expect(generateTotpToken(dashed, 0)).toBe("755224");
		expect(generateTotpToken(`${RFC_SECRET}===`, 0)).toBe("755224");
		expect(generateTotpToken(RFC_SECRET.toLowerCase(), 0)).toBe("755224");
	});
});

describe("verifyTotpToken", () => {
	const now = 90_000; // counter 3 -> "969429"

	it("accepts the current-step token", () => {
		expect(verifyTotpToken(RFC_SECRET, "969429", 1, now)).toBe(true);
	});

	it("accepts previous and next step tokens within the default window", () => {
		expect(verifyTotpToken(RFC_SECRET, "359152", 1, now)).toBe(true); // counter 2
		expect(verifyTotpToken(RFC_SECRET, "338314", 1, now)).toBe(true); // counter 4
	});

	it("rejects tokens outside the window", () => {
		expect(verifyTotpToken(RFC_SECRET, "287082", 1, now)).toBe(false); // counter 1
		expect(verifyTotpToken(RFC_SECRET, "254676", 1, now)).toBe(false); // counter 5
	});

	it("window=0 only accepts the exact current step", () => {
		expect(verifyTotpToken(RFC_SECRET, "969429", 0, now)).toBe(true);
		expect(verifyTotpToken(RFC_SECRET, "359152", 0, now)).toBe(false);
	});

	it("a wider window accepts older tokens", () => {
		expect(verifyTotpToken(RFC_SECRET, "287082", 2, now)).toBe(true); // counter 1
	});

	it("strips non-digit characters before comparing", () => {
		expect(verifyTotpToken(RFC_SECRET, "969-429", 1, now)).toBe(true);
		expect(verifyTotpToken(RFC_SECRET, " 969 429 ", 1, now)).toBe(true);
	});

	it("rejects tokens that are not exactly 6 digits after cleaning", () => {
		expect(verifyTotpToken(RFC_SECRET, "96942", 1, now)).toBe(false);
		expect(verifyTotpToken(RFC_SECRET, "9694299", 1, now)).toBe(false);
		expect(verifyTotpToken(RFC_SECRET, "", 1, now)).toBe(false);
		expect(verifyTotpToken(RFC_SECRET, "abcdef", 1, now)).toBe(false);
	});

	it("rejects a valid-format but wrong code", () => {
		expect(verifyTotpToken(RFC_SECRET, "000000", 1, now)).toBe(false);
	});
});

describe("generateTotpSecret", () => {
	it("produces 32 base32 chars for the default 20 bytes", () => {
		const secret = generateTotpSecret();
		expect(secret).toHaveLength(32);
		expect(secret).toMatch(/^[A-Z2-7]+$/);
	});

	it("length scales with byteLength (10 bytes -> 16 chars)", () => {
		expect(generateTotpSecret(10)).toHaveLength(16);
	});

	it("generates distinct secrets", () => {
		expect(generateTotpSecret()).not.toBe(generateTotpSecret());
	});

	it("generated secrets round-trip through token generation/verification", () => {
		const secret = generateTotpSecret();
		const now = Date.now();
		const token = generateTotpToken(secret, now);
		expect(verifyTotpToken(secret, token, 1, now)).toBe(true);
	});
});

describe("buildOtpAuthUrl", () => {
	it("builds a spec-shaped otpauth URL with defaults", () => {
		const url = buildOtpAuthUrl({ secret: RFC_SECRET, account: "a@b.co" });
		expect(url.startsWith("otpauth://totp/manageRenta%3Aa%40b.co?")).toBe(
			true,
		);
		const params = new URL(url).searchParams;
		expect(params.get("secret")).toBe(RFC_SECRET);
		expect(params.get("issuer")).toBe("manageRenta");
		expect(params.get("algorithm")).toBe("SHA1");
		expect(params.get("digits")).toBe("6");
		expect(params.get("period")).toBe("30");
	});

	it("honors a custom issuer and URL-encodes the label", () => {
		const url = buildOtpAuthUrl({
			secret: RFC_SECRET,
			account: "user name@example.com",
			issuer: "My App",
		});
		expect(url).toContain(
			encodeURIComponent("My App:user name@example.com"),
		);
		expect(new URL(url).searchParams.get("issuer")).toBe("My App");
	});
});

describe("generateRecoveryCodes", () => {
	it("returns 8 codes by default in xxxxx-xxxxx hex format", () => {
		const codes = generateRecoveryCodes();
		expect(codes).toHaveLength(8);
		for (const code of codes) {
			expect(code).toMatch(/^[0-9a-f]{5}-[0-9a-f]{5}$/);
		}
	});

	it("respects a custom count and produces unique codes", () => {
		const codes = generateRecoveryCodes(20);
		expect(codes).toHaveLength(20);
		expect(new Set(codes).size).toBe(20);
	});

	it("returns an empty list for count 0", () => {
		expect(generateRecoveryCodes(0)).toEqual([]);
	});
});

describe("generateOtpAuthQrCode", () => {
	it("renders the otpauth URL to a PNG data URL", async () => {
		const url = buildOtpAuthUrl({ secret: RFC_SECRET, account: "a@b.co" });
		const dataUrl = await generateOtpAuthQrCode(url);
		expect(dataUrl.startsWith("data:image/png;base64,")).toBe(true);
		// base64 payload must be non-trivial
		expect(dataUrl.length).toBeGreaterThan(100);
	});
});
