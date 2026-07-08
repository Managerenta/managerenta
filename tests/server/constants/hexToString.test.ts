import { describe, expect, it } from "vitest";
import hexToString from "@/server/constants/hexToString";

describe("hexToString", () => {
	it("converts a 0x-prefixed hex value to its decimal string", () => {
		expect(hexToString("0x41")).toBe("65");
		expect(hexToString("0xff")).toBe("255");
		expect(hexToString("0x0")).toBe("0");
	});

	it("handles multi-byte hex numbers", () => {
		expect(hexToString("0x1e240")).toBe("123456");
	});

	it("returns null for non-hex payloads", () => {
		expect(hexToString("0xzz")).toBeNull();
		expect(hexToString("0x")).toBeNull();
	});

	it("returns null for strings too short to carry a value after the prefix", () => {
		// slice(2) always removes the first two chars, so "41" becomes "".
		expect(hexToString("41")).toBeNull();
		expect(hexToString("")).toBeNull();
	});

	it("strips the first two characters regardless of prefix content", () => {
		// Documents actual behavior: "1234" -> parseInt("34", 16) = 52.
		expect(hexToString("1234")).toBe("52");
	});
});
