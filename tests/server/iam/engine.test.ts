import { describe, expect, it } from "vitest";
import {
	actionMatches,
	conditionMatches,
	evaluate,
	ipInCidr,
	resourceMatches,
} from "../../../src/server/iam/engine";
import type {
	ConditionContext,
	NamedPolicy,
	PolicyStatement,
} from "../../../src/server/iam/types";

function policy(name: string, statements: PolicyStatement[]): NamedPolicy {
	return { name, document: { version: "2026-01-01", statements } };
}

const ORG_USER = "mr:org:iam:652:user/u1";
const ORG_RES = "mr:org:properties:652:property/908";
const baseCtx: ConditionContext = {
	currentTime: new Date("2026-07-08T00:00:00Z"),
};

describe("actionMatches", () => {
	it("matches exact, full wildcard, and segment wildcard", () => {
		expect(actionMatches("properties:Read", "properties:Read")).toBe(true);
		expect(actionMatches("*", "anything:Here")).toBe(true);
		expect(actionMatches("properties:*", "properties:Update")).toBe(true);
		expect(actionMatches("*:Read", "tenants:Read")).toBe(true);
	});

	it("rejects mismatched service or verb, and malformed patterns", () => {
		expect(actionMatches("properties:Read", "tenants:Read")).toBe(false);
		expect(actionMatches("properties:Read", "properties:Update")).toBe(
			false,
		);
		expect(actionMatches("properties", "properties:Read")).toBe(false);
		expect(actionMatches("properties:Read", "propertiesRead")).toBe(false);
	});
});

describe("resourceMatches", () => {
	it("matches exact and per-segment wildcards", () => {
		expect(resourceMatches(ORG_RES, ORG_RES)).toBe(true);
		expect(resourceMatches("mr:org:*:652:*/*", ORG_RES)).toBe(true);
		expect(
			resourceMatches("mr:org:properties:652:property/*", ORG_RES),
		).toBe(true);
		expect(
			resourceMatches("mr:org:properties:*:property/908", ORG_RES),
		).toBe(true);
	});

	it("supports trailing-* prefix match on the id segment", () => {
		expect(
			resourceMatches("mr:org:properties:652:property/90*", ORG_RES),
		).toBe(true);
		expect(
			resourceMatches("mr:org:properties:652:property/8*", ORG_RES),
		).toBe(false);
	});

	it("rejects segment mismatches", () => {
		expect(resourceMatches("mr:org:tenants:652:*/*", ORG_RES)).toBe(false);
		expect(
			resourceMatches("mr:org:properties:999:property/*", ORG_RES),
		).toBe(false);
		expect(
			resourceMatches("mr:platform:properties:652:property/*", ORG_RES),
		).toBe(false);
		expect(resourceMatches("mr:org:properties:652:unit/*", ORG_RES)).toBe(
			false,
		);
	});

	it("fails closed on malformed pattern or target", () => {
		expect(resourceMatches("garbage", ORG_RES)).toBe(false);
		expect(resourceMatches("mr:org:properties:652:noslash", ORG_RES)).toBe(
			false,
		);
		expect(resourceMatches("mr:org:*:652:*/*", "garbage-target")).toBe(
			false,
		);
	});
});

describe("ipInCidr", () => {
	it("matches within a CIDR range and a bare /32", () => {
		expect(ipInCidr("10.0.0.5", "10.0.0.0/24")).toBe(true);
		expect(ipInCidr("10.0.1.5", "10.0.0.0/24")).toBe(false);
		expect(ipInCidr("1.2.3.4", "1.2.3.4")).toBe(true);
		expect(ipInCidr("1.2.3.5", "1.2.3.4")).toBe(false);
		expect(ipInCidr("1.2.3.4", "0.0.0.0/0")).toBe(true);
		expect(ipInCidr("255.255.255.255", "255.255.255.255/32")).toBe(true);
	});

	it("fails closed on invalid IPs, masks, and non-IPv4 input", () => {
		expect(ipInCidr("10.0.0.5", "10.0.0.0/33")).toBe(false);
		expect(ipInCidr("10.0.0.5", "10.0.0.0/-1")).toBe(false);
		expect(ipInCidr("10.0.0.5", "10.0.0.0/x")).toBe(false);
		expect(ipInCidr("999.0.0.1", "10.0.0.0/24")).toBe(false);
		expect(ipInCidr("10.0.0", "10.0.0.0/24")).toBe(false);
		expect(ipInCidr("10.0.0.5", "not.an.ip/24")).toBe(false);
		expect(ipInCidr("::1", "::1")).toBe(false);
		expect(ipInCidr("10.0.0.a", "10.0.0.0/24")).toBe(false);
	});
});

describe("conditionMatches", () => {
	it("returns true for an absent condition block", () => {
		expect(conditionMatches(undefined, baseCtx)).toBe(true);
	});

	it("StringEquals / StringNotEquals against mr:OrgId", () => {
		const ctx = { ...baseCtx, orgId: "652" };
		expect(
			conditionMatches({ StringEquals: { "mr:OrgId": ["652"] } }, ctx),
		).toBe(true);
		expect(
			conditionMatches({ StringEquals: { "mr:OrgId": ["999"] } }, ctx),
		).toBe(false);
		expect(
			conditionMatches({ StringNotEquals: { "mr:OrgId": ["999"] } }, ctx),
		).toBe(true);
		expect(
			conditionMatches({ StringNotEquals: { "mr:OrgId": ["652"] } }, ctx),
		).toBe(false);
		// Missing context value fails closed for both operators.
		expect(
			conditionMatches(
				{ StringEquals: { "mr:OrgId": ["652"] } },
				baseCtx,
			),
		).toBe(false);
		expect(
			conditionMatches(
				{ StringNotEquals: { "mr:OrgId": ["652"] } },
				baseCtx,
			),
		).toBe(false);
	});

	it("Bool against mr:MfaPresent", () => {
		expect(
			conditionMatches(
				{ Bool: { "mr:MfaPresent": ["true"] } },
				{ ...baseCtx, mfaPresent: true },
			),
		).toBe(true);
		expect(
			conditionMatches(
				{ Bool: { "mr:MfaPresent": ["true"] } },
				{ ...baseCtx, mfaPresent: false },
			),
		).toBe(false);
		// Missing / non-boolean context, and unparseable bool literal, fail closed.
		expect(
			conditionMatches({ Bool: { "mr:MfaPresent": ["true"] } }, baseCtx),
		).toBe(false);
		expect(
			conditionMatches(
				{ Bool: { "mr:MfaPresent": ["maybe"] } },
				{ ...baseCtx, mfaPresent: true },
			),
		).toBe(false);
	});

	it("IpAddress against mr:SourceIp", () => {
		expect(
			conditionMatches(
				{ IpAddress: { "mr:SourceIp": ["10.0.0.0/24"] } },
				{ ...baseCtx, sourceIp: "10.0.0.9" },
			),
		).toBe(true);
		expect(
			conditionMatches(
				{ IpAddress: { "mr:SourceIp": ["10.0.0.0/24"] } },
				{ ...baseCtx, sourceIp: "192.168.0.1" },
			),
		).toBe(false);
		expect(
			conditionMatches(
				{ IpAddress: { "mr:SourceIp": ["10.0.0.0/24"] } },
				baseCtx,
			),
		).toBe(false);
	});

	it("DateGreaterThan / DateLessThan against mr:CurrentTime", () => {
		const ctx = {
			...baseCtx,
			currentTime: new Date("2026-07-08T12:00:00Z"),
		};
		expect(
			conditionMatches(
				{
					DateGreaterThan: {
						"mr:CurrentTime": ["2026-07-08T00:00:00Z"],
					},
				},
				ctx,
			),
		).toBe(true);
		expect(
			conditionMatches(
				{
					DateLessThan: {
						"mr:CurrentTime": ["2026-07-09T00:00:00Z"],
					},
				},
				ctx,
			),
		).toBe(true);
		expect(
			conditionMatches(
				{
					DateGreaterThan: {
						"mr:CurrentTime": ["2026-07-09T00:00:00Z"],
					},
				},
				ctx,
			),
		).toBe(false);
		// Unparseable bound fails closed.
		expect(
			conditionMatches(
				{ DateGreaterThan: { "mr:CurrentTime": ["not-a-date"] } },
				ctx,
			),
		).toBe(false);
	});

	it("fails closed on unknown operator, unknown key, or non-array values", () => {
		expect(
			conditionMatches(
				{ StringLike: { "mr:OrgId": ["652"] } },
				{ ...baseCtx, orgId: "652" },
			),
		).toBe(false);
		expect(
			conditionMatches(
				{ StringEquals: { "mr:Unknown": ["x"] } },
				{ ...baseCtx, orgId: "652" },
			),
		).toBe(false);
		expect(
			conditionMatches(
				{
					StringEquals: {
						"mr:OrgId": "652" as unknown as string[],
					},
				},
				{ ...baseCtx, orgId: "652" },
			),
		).toBe(false);
	});

	it("ANDs all pairs and ORs values within a key", () => {
		const ctx = { ...baseCtx, orgId: "652", mfaPresent: true };
		expect(
			conditionMatches(
				{
					StringEquals: { "mr:OrgId": ["111", "652"] },
					Bool: { "mr:MfaPresent": ["true"] },
				},
				ctx,
			),
		).toBe(true);
		// Second pair fails → whole block fails.
		expect(
			conditionMatches(
				{
					StringEquals: { "mr:OrgId": ["652"] },
					Bool: { "mr:MfaPresent": ["false"] },
				},
				ctx,
			),
		).toBe(false);
	});
});

describe("evaluate — AWS semantics", () => {
	it("default-denies when no policy grants access", () => {
		const r = evaluate({
			principalArn: ORG_USER,
			action: "properties:Read",
			resource: ORG_RES,
			context: baseCtx,
			policies: [],
		});
		expect(r.decision).toBe("deny");
		expect(r.reason).toMatch(/implicit deny/);
	});

	it("allows on a single matching Allow and names the statement", () => {
		const r = evaluate({
			principalArn: ORG_USER,
			action: "properties:Read",
			resource: ORG_RES,
			context: baseCtx,
			policies: [
				policy("OrgViewer", [
					{
						sid: "ReadOnly",
						effect: "Allow",
						action: ["properties:Read"],
						resource: ["mr:org:properties:652:property/*"],
					},
				]),
			],
		});
		expect(r.decision).toBe("allow");
		expect(r.reason).toContain("OrgViewer#ReadOnly");
	});

	it("explicit Deny overrides an Allow regardless of order", () => {
		const allow = policy("Allow", [
			{
				effect: "Allow",
				action: ["*"],
				resource: ["mr:org:*:652:*/*"],
			},
		]);
		const deny = policy("Deny", [
			{
				sid: "NoDelete",
				effect: "Deny",
				action: ["properties:Delete"],
				resource: ["mr:org:*:652:*/*"],
			},
		]);
		const r = evaluate({
			principalArn: ORG_USER,
			action: "properties:Delete",
			resource: ORG_RES,
			context: baseCtx,
			policies: [allow, deny],
		});
		expect(r.decision).toBe("deny");
		expect(r.reason).toContain("explicit deny by Deny#NoDelete");
	});

	it("names the policy when a statement has no sid", () => {
		const r = evaluate({
			principalArn: ORG_USER,
			action: "properties:Read",
			resource: ORG_RES,
			context: baseCtx,
			policies: [
				policy("OrgAdmin", [
					{
						effect: "Allow",
						action: ["*"],
						resource: ["mr:org:*:652:*/*"],
					},
				]),
			],
		});
		expect(r.decision).toBe("allow");
		expect(r.reason).toBe("allowed by OrgAdmin");
	});

	it("enforces cross-plane isolation (org principal vs platform resource)", () => {
		const r = evaluate({
			principalArn: ORG_USER,
			action: "organizations:List",
			resource: "mr:platform:organizations:*:organization/*",
			context: baseCtx,
			policies: [
				policy("Everything", [
					{
						effect: "Allow",
						action: ["*"],
						resource: ["mr:platform:*:*:*/*"],
					},
				]),
			],
		});
		expect(r.decision).toBe("deny");
		expect(r.reason).toMatch(/cross-plane/);
	});

	it("denies on a malformed principal or resource ARN", () => {
		expect(
			evaluate({
				principalArn: "garbage",
				action: "properties:Read",
				resource: ORG_RES,
				context: baseCtx,
				policies: [],
			}).decision,
		).toBe("deny");
		expect(
			evaluate({
				principalArn: ORG_USER,
				action: "properties:Read",
				resource: "garbage",
				context: baseCtx,
				policies: [],
			}).reason,
		).toMatch(/malformed/);
	});

	it("ignores malformed policies and statements without throwing", () => {
		const r = evaluate({
			principalArn: ORG_USER,
			action: "properties:Read",
			resource: ORG_RES,
			context: baseCtx,
			policies: [
				null as unknown as NamedPolicy,
				{
					name: "Broken",
					document: { version: "1", statements: null },
				} as unknown as NamedPolicy,
				policy("BadEffect", [
					{
						effect: "Sideways" as unknown as "Allow",
						action: ["properties:Read"],
						resource: [ORG_RES],
					},
				]),
				policy("BadShape", [
					{
						effect: "Allow",
						action: null as unknown as string[],
						resource: [ORG_RES],
					},
					{
						effect: "Allow",
						action: ["properties:Read"],
						resource: null as unknown as string[],
					},
				]),
			],
		});
		expect(r.decision).toBe("deny");
	});

	it("respects conditions on the deciding statement", () => {
		const conditional = policy("MfaGated", [
			{
				sid: "RequireMfa",
				effect: "Allow",
				action: ["properties:Update"],
				resource: ["mr:org:*:652:*/*"],
				condition: { Bool: { "mr:MfaPresent": ["true"] } },
			},
		]);
		const denied = evaluate({
			principalArn: ORG_USER,
			action: "properties:Update",
			resource: ORG_RES,
			context: { ...baseCtx, mfaPresent: false },
			policies: [conditional],
		});
		expect(denied.decision).toBe("deny");
		const allowed = evaluate({
			principalArn: ORG_USER,
			action: "properties:Update",
			resource: ORG_RES,
			context: { ...baseCtx, mfaPresent: true },
			policies: [conditional],
		});
		expect(allowed.decision).toBe("allow");
	});
});
