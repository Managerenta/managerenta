import { parseArn } from "./arn";
import type {
	ConditionBlock,
	ConditionContext,
	Decision,
	EvaluateInput,
	PolicyStatement,
} from "./types";

// ── Pure evaluation engine ──────────────────────────────────────────────────
// evaluate() has no I/O and no clock read (time arrives via context.currentTime)
// so it is deterministic and exhaustively unit-testable. AWS semantics:
// default-deny, explicit-deny-wins, allow only on an explicit matching Allow.

/**
 * Match a policy action pattern against a concrete requested action.
 * Supports the two wildcard forms the spec allows: full `*` and
 * segment-wildcard `service:*`. Comparison is literal per segment — no regex
 * from policy input, so a crafted pattern cannot cause catastrophic
 * backtracking.
 */
export function actionMatches(pattern: string, action: string): boolean {
	if (pattern === "*") return true;
	if (pattern === action) return true;
	const [pService, pVerb] = splitOnce(pattern, ":");
	const [aService, aVerb] = splitOnce(action, ":");
	if (pVerb === undefined || aVerb === undefined) return false;
	if (pService !== aService && pService !== "*") return false;
	return pVerb === "*" || pVerb === aVerb;
}

/**
 * Match a resource ARN pattern against a concrete target ARN, segment by
 * segment. Each of the six segments (namespace, plane, service, orgId, type,
 * id) may be a literal or `*`. The id segment additionally supports a trailing
 * `*` prefix match (e.g. `property/652*`). Tokenised by `:` and `/`; never a
 * regex compile.
 */
export function resourceMatches(pattern: string, target: string): boolean {
	if (pattern === target) return true;
	const p = parseArn(pattern);
	const t = parseArn(target);
	// A malformed target can never be matched (fail closed). A malformed pattern
	// likewise matches nothing.
	if (!t.valid || !isParseableShape(pattern)) return false;
	if (!segmentMatch(p.namespace, t.namespace)) return false;
	if (!segmentMatch(p.plane, t.plane)) return false;
	if (!segmentMatch(p.service, t.service)) return false;
	if (!segmentMatch(p.orgId, t.orgId)) return false;
	if (!segmentMatch(p.type, t.type)) return false;
	if (!idMatch(p.id, t.id)) return false;
	return true;
}

function isParseableShape(value: string): boolean {
	const fields = value.split(":");
	return fields.length === 5 && (fields[4] ?? "").includes("/");
}

function segmentMatch(pattern: string, value: string): boolean {
	return pattern === "*" || pattern === value;
}

function idMatch(pattern: string, value: string): boolean {
	if (pattern === "*" || pattern === value) return true;
	if (pattern.endsWith("*")) {
		return value.startsWith(pattern.slice(0, -1));
	}
	return false;
}

function splitOnce(value: string, sep: string): [string, string | undefined] {
	const idx = value.indexOf(sep);
	if (idx < 0) return [value, undefined];
	return [value.slice(0, idx), value.slice(idx + 1)];
}

// ── Condition evaluation ────────────────────────────────────────────────────

const CONDITION_KEYS = [
	"mr:OrgId",
	"mr:ResourceOwner",
	"mr:MfaPresent",
	"mr:SourceIp",
	"mr:CurrentTime",
] as const;
type ConditionKey = (typeof CONDITION_KEYS)[number];
const CONDITION_KEY_SET = new Set<string>(CONDITION_KEYS);

const CONDITION_OPERATORS = [
	"StringEquals",
	"StringNotEquals",
	"Bool",
	"IpAddress",
	"DateGreaterThan",
	"DateLessThan",
] as const;
type ConditionOperator = (typeof CONDITION_OPERATORS)[number];
const CONDITION_OPERATOR_SET = new Set<string>(CONDITION_OPERATORS);

/**
 * A condition block is satisfied when EVERY operator/key pair inside it is
 * satisfied (AND across the block). Within a single key the policy values are
 * OR'd. Any unknown operator, unknown key, or missing context value causes the
 * whole block to fail closed — treated as non-matching, never a throw.
 */
export function conditionMatches(
	condition: ConditionBlock | undefined,
	context: ConditionContext,
): boolean {
	if (!condition) return true;
	for (const [operator, keys] of Object.entries(condition)) {
		if (!CONDITION_OPERATOR_SET.has(operator)) return false; // unknown op → closed
		for (const [key, values] of Object.entries(keys)) {
			if (!CONDITION_KEY_SET.has(key)) return false; // unknown key → closed
			if (!Array.isArray(values)) return false;
			const contextValue = contextValueFor(key as ConditionKey, context);
			if (
				!operatorSatisfied(
					operator as ConditionOperator,
					contextValue,
					values,
				)
			) {
				return false;
			}
		}
	}
	return true;
}

function contextValueFor(
	key: ConditionKey,
	context: ConditionContext,
): string | boolean | Date | null | undefined {
	switch (key) {
		case "mr:OrgId":
			return context.orgId ?? undefined;
		case "mr:ResourceOwner":
			return context.resourceOwner ?? undefined;
		case "mr:MfaPresent":
			return context.mfaPresent;
		case "mr:SourceIp":
			return context.sourceIp;
		case "mr:CurrentTime":
			return context.currentTime;
	}
}

function operatorSatisfied(
	operator: ConditionOperator,
	contextValue: string | boolean | Date | null | undefined,
	values: string[],
): boolean {
	switch (operator) {
		case "StringEquals":
			if (typeof contextValue !== "string") return false;
			return values.includes(contextValue);
		case "StringNotEquals":
			// Missing context value fails closed rather than vacuously passing.
			if (typeof contextValue !== "string") return false;
			return !values.includes(contextValue);
		case "Bool": {
			if (typeof contextValue !== "boolean") return false;
			return values.some((v) => boolFromString(v) === contextValue);
		}
		case "IpAddress": {
			if (typeof contextValue !== "string") return false;
			return values.some((cidr) => ipInCidr(contextValue, cidr));
		}
		case "DateGreaterThan":
			return dateCompare(
				contextValue,
				values,
				(ctx, bound) => ctx > bound,
			);
		case "DateLessThan":
			return dateCompare(
				contextValue,
				values,
				(ctx, bound) => ctx < bound,
			);
	}
}

function boolFromString(value: string): boolean | null {
	if (value === "true") return true;
	if (value === "false") return false;
	return null;
}

function dateCompare(
	contextValue: string | boolean | Date | null | undefined,
	bounds: string[],
	cmp: (ctx: number, bound: number) => boolean,
): boolean {
	const ctxMs =
		contextValue instanceof Date ? contextValue.getTime() : Number.NaN;
	if (Number.isNaN(ctxMs)) return false;
	return bounds.some((bound) => {
		const boundMs = Date.parse(bound);
		if (Number.isNaN(boundMs)) return false;
		return cmp(ctxMs, boundMs);
	});
}

/**
 * IPv4 CIDR containment without external deps. A bare address is treated as a
 * /32. Non-IPv4 input (including IPv6) fails closed — a bounded v1 decision.
 */
export function ipInCidr(ip: string, cidr: string): boolean {
	const slash = cidr.indexOf("/");
	const network = slash < 0 ? cidr : cidr.slice(0, slash);
	const bitsRaw = slash < 0 ? "32" : cidr.slice(slash + 1);
	const bits = Number(bitsRaw);
	if (!Number.isInteger(bits) || bits < 0 || bits > 32) return false;
	const ipNum = ipv4ToInt(ip);
	const netNum = ipv4ToInt(network);
	if (ipNum === null || netNum === null) return false;
	if (bits === 0) return true;
	const mask = bits === 32 ? 0xffffffff : (0xffffffff << (32 - bits)) >>> 0;
	return (ipNum & mask) >>> 0 === (netNum & mask) >>> 0;
}

function ipv4ToInt(ip: string): number | null {
	const parts = ip.split(".");
	if (parts.length !== 4) return null;
	let out = 0;
	for (const part of parts) {
		if (!/^\d{1,3}$/.test(part)) return null;
		const n = Number(part);
		if (n > 255) return null;
		out = (out << 8) | n;
	}
	return out >>> 0;
}

// ── The decision function ───────────────────────────────────────────────────

/**
 * Evaluate a single authorization request against a flattened policy set.
 * Returns the decision plus a `reason` naming the deciding statement — the
 * reason is a first-class feature used by audit logs and the admin console,
 * not debug output.
 */
export function evaluate(input: EvaluateInput): Decision {
	const { principalArn, action, resource, context, policies } = input;

	// Cross-plane isolation: an org principal can never act on a platform
	// resource and vice-versa. Enforced before any statement is considered.
	const principal = parseArn(principalArn);
	const target = parseArn(resource);
	if (!principal.valid || !target.valid) {
		return { decision: "deny", reason: "implicit deny (malformed ARN)" };
	}
	if (principal.plane !== target.plane) {
		return {
			decision: "deny",
			reason: `implicit deny (cross-plane: ${principal.plane} → ${target.plane})`,
		};
	}

	let allow: { statement: PolicyStatement; policyName: string } | null = null;

	for (const policy of policies) {
		if (!policy || !Array.isArray(policy.document?.statements)) continue;
		for (const statement of policy.document.statements) {
			if (!statementMatches(statement, action, resource, context)) {
				continue;
			}
			if (statement.effect === "Deny") {
				// Explicit deny wins immediately.
				return {
					decision: "deny",
					reason: `explicit deny by ${describe(policy.name, statement)}`,
				};
			}
			if (statement.effect === "Allow" && !allow) {
				allow = { statement, policyName: policy.name };
			}
		}
	}

	if (allow) {
		return {
			decision: "allow",
			reason: `allowed by ${describe(allow.policyName, allow.statement)}`,
		};
	}
	return { decision: "deny", reason: "implicit deny (no matching allow)" };
}

function statementMatches(
	statement: PolicyStatement,
	action: string,
	resource: string,
	context: ConditionContext,
): boolean {
	if (!statement || !Array.isArray(statement.action)) return false;
	if (!Array.isArray(statement.resource)) return false;
	if (statement.effect !== "Allow" && statement.effect !== "Deny") {
		return false;
	}
	if (!statement.action.some((p) => actionMatches(p, action))) return false;
	if (!statement.resource.some((p) => resourceMatches(p, resource))) {
		return false;
	}
	return conditionMatches(statement.condition, context);
}

function describe(policyName: string, statement: PolicyStatement): string {
	return statement.sid ? `${policyName}#${statement.sid}` : `${policyName}`;
}
