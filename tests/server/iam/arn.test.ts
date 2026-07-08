import { describe, expect, it } from "vitest";
import {
	ACTION_MAP,
	ACTIONS,
	arn,
	assertAction,
	IAM_NAMESPACE,
	isAction,
	PLANES,
	parseArn,
	principalArnForOperator,
	principalArnForUser,
	RESOURCE_TYPE,
	resourceArn,
	SERVICES,
} from "../../../src/server/iam/arn";

describe("closed sets", () => {
	it("exposes the namespace, planes, services, and resource types", () => {
		expect(IAM_NAMESPACE).toBe("mr");
		expect(PLANES).toEqual(["platform", "org"]);
		expect(SERVICES).toContain("properties");
		expect(SERVICES).toContain("iam");
		// Every service has a resource-type noun.
		for (const service of SERVICES) {
			expect(typeof RESOURCE_TYPE[service]).toBe("string");
			expect(RESOURCE_TYPE[service].length).toBeGreaterThan(0);
		}
	});

	it("derives ACTIONS as every service:Verb pair", () => {
		let expected = 0;
		for (const service of SERVICES) expected += ACTION_MAP[service].length;
		expect(ACTIONS.length).toBe(expected);
		expect(ACTIONS).toContain("properties:Read");
		expect(ACTIONS).toContain("tenants:SendReminder");
		expect(ACTIONS).toContain("organizations:Suspend");
		expect(ACTIONS).toContain("iam:AttachPolicy");
		expect(ACTIONS).toContain("settings:Update");
	});
});

describe("isAction / assertAction", () => {
	it("recognises concrete actions and rejects unknown / wildcard strings", () => {
		expect(isAction("properties:Read")).toBe(true);
		expect(isAction("properties:*")).toBe(false);
		expect(isAction("nope:Read")).toBe(false);
		expect(isAction("*")).toBe(false);
	});

	it("assertAction returns the action or throws", () => {
		expect(assertAction("units:Delete")).toBe("units:Delete");
		expect(() => assertAction("units:Explode")).toThrow(
			/Unknown IAM action/,
		);
	});
});

describe("ARN builders", () => {
	it("builds org-plane resource ARNs with default and explicit ids", () => {
		expect(arn.org.properties("652")).toBe(
			"mr:org:properties:652:property/*",
		);
		expect(arn.org.properties("652", "908")).toBe(
			"mr:org:properties:652:property/908",
		);
		expect(arn.org.audit("652")).toBe("mr:org:audit:652:event/*");
	});

	it("builds platform-plane resource ARNs", () => {
		expect(arn.platform.organizations()).toBe(
			"mr:platform:organizations:*:organization/*",
		);
		expect(arn.platform.settings("global")).toBe(
			"mr:platform:settings:*:config/global",
		);
		expect(arn.platform.properties("*", "652")).toBe(
			"mr:platform:properties:652:property/*",
		);
	});

	it("resourceArn allows an explicit type override", () => {
		expect(resourceArn("org", "iam", "652", "u1", "user")).toBe(
			"mr:org:iam:652:user/u1",
		);
	});

	it("builds principal ARNs whose plane drives isolation", () => {
		expect(principalArnForUser("652", "u1")).toBe("mr:org:iam:652:user/u1");
		expect(principalArnForOperator("op1")).toBe(
			"mr:platform:iam:*:operator/op1",
		);
	});
});

describe("parseArn", () => {
	it("parses a well-formed ARN into segments", () => {
		const p = parseArn("mr:org:properties:652:property/908");
		expect(p).toEqual({
			namespace: "mr",
			plane: "org",
			service: "properties",
			orgId: "652",
			type: "property",
			id: "908",
			valid: true,
		});
	});

	it("marks malformed ARNs invalid without throwing", () => {
		expect(parseArn("too:few:fields").valid).toBe(false);
		expect(parseArn("mr:org:properties:652:noslashhere").valid).toBe(false);
		expect(parseArn("x:org:properties:652:property/908").valid).toBe(false);
		expect(parseArn("mr:org:properties:652:/908").valid).toBe(false);
		// non-string input
		expect(parseArn(undefined as unknown as string).valid).toBe(false);
	});
});
