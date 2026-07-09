// Pure unit tests for the friendly policy-builder transform. No DB, no network.
// The transform is the contract between the radio UI and real policy documents,
// so its round-trip and fail-safe behaviour are covered exhaustively here.
import { describe, expect, it } from "vitest";
import {
	buildDocumentFromSelections,
	POLICY_BUILDER_VERSION,
	parseSelectionsFromDocument,
	readActionsFor,
} from "../../src/libs/AdminWrapper/pages/Iam/policyBuilder";

describe("policyBuilder — buildDocumentFromSelections", () => {
	it("produces an empty (but valid) document for no selections", () => {
		const doc = buildDocumentFromSelections({});
		expect(doc.version).toBe(POLICY_BUILDER_VERSION);
		expect(doc.statements).toEqual([]);
	});

	it("emits a wildcard action + platform ARN for Full access", () => {
		const doc = buildDocumentFromSelections({ properties: "full" });
		expect(doc.statements).toHaveLength(1);
		const [st] = doc.statements;
		expect(st.effect).toBe("Allow");
		expect(st.action).toEqual(["properties:*"]);
		expect(st.resource).toEqual(["mr:platform:properties:*:property/*"]);
	});

	it("emits Read+List for Read-only when the service has both verbs", () => {
		const doc = buildDocumentFromSelections({ billing: "read" });
		const [st] = doc.statements;
		expect(st.action).toEqual(["billing:Read", "billing:List"]);
		expect(st.resource).toEqual(["mr:platform:billing:*:invoice/*"]);
	});

	it("emits only the verbs the service actually exposes (settings has no List)", () => {
		expect(readActionsFor("settings")).toEqual(["settings:Read"]);
		const doc = buildDocumentFromSelections({ settings: "read" });
		expect(doc.statements[0].action).toEqual(["settings:Read"]);
	});

	it("omits services set to Off", () => {
		const doc = buildDocumentFromSelections({
			properties: "off",
			units: "full",
		});
		expect(doc.statements.map((s) => s.resource[0])).toEqual([
			"mr:platform:units:*:unit/*",
		]);
	});
});

describe("policyBuilder — parseSelectionsFromDocument (reverse)", () => {
	it("round-trips a builder-authored document exactly", () => {
		const selections = {
			properties: "full",
			billing: "read",
			iam: "full",
		} as const;
		const doc = buildDocumentFromSelections(selections);
		const parsed = parseSelectionsFromDocument(doc);
		expect(parsed.exact).toBe(true);
		expect(parsed.selections).toEqual(selections);
	});

	it("flags a Deny statement as not representable", () => {
		const parsed = parseSelectionsFromDocument({
			version: POLICY_BUILDER_VERSION,
			statements: [
				{
					effect: "Deny",
					action: ["iam:*"],
					resource: ["mr:platform:iam:*:resource/*"],
				},
			],
		});
		expect(parsed.exact).toBe(false);
	});

	it("flags a statement with a condition block as not representable", () => {
		const parsed = parseSelectionsFromDocument({
			version: POLICY_BUILDER_VERSION,
			statements: [
				{
					effect: "Allow",
					action: ["properties:*"],
					resource: ["mr:platform:properties:*:property/*"],
					condition: { StringEquals: { "mr:orgId": ["x"] } },
				},
			],
		});
		expect(parsed.exact).toBe(false);
	});

	it("flags an unknown / non-platform resource as not representable", () => {
		const parsed = parseSelectionsFromDocument({
			version: POLICY_BUILDER_VERSION,
			statements: [
				{
					effect: "Allow",
					action: ["properties:*"],
					resource: ["mr:org:properties:someorg:property/*"],
				},
			],
		});
		expect(parsed.exact).toBe(false);
	});

	it("flags a partial (mixed) action set as not representable", () => {
		const parsed = parseSelectionsFromDocument({
			version: POLICY_BUILDER_VERSION,
			statements: [
				{
					effect: "Allow",
					action: ["properties:Create"],
					resource: ["mr:platform:properties:*:property/*"],
				},
			],
		});
		expect(parsed.exact).toBe(false);
	});

	it("treats a non-object / malformed document as not representable", () => {
		expect(parseSelectionsFromDocument(null).exact).toBe(false);
		expect(parseSelectionsFromDocument({}).exact).toBe(false);
		expect(
			parseSelectionsFromDocument({ version: "x", statements: "nope" })
				.exact,
		).toBe(false);
	});
});
