// Shared IAM type vocabulary. Pure types only (no runtime values) so this file
// is excluded from coverage via the `**/types.ts` rule in vitest.config.ts.
// Runtime closed sets (services, verbs, actions) live in `arn.ts`.

export type Plane = "platform" | "org";
export type Effect = "Allow" | "Deny";
export type PrincipalType = "user" | "operator";
export type ManagedBy = "system" | "customer";

/**
 * A single statement inside a managed policy document. `action` and `resource`
 * are pattern arrays (segment wildcards allowed). `condition` is an optional
 * AWS-shaped block: `{ [operator]: { [conditionKey]: string[] } }`.
 */
export interface PolicyStatement {
	sid?: string;
	effect: Effect;
	action: string[];
	resource: string[];
	condition?: ConditionBlock;
}

export type ConditionBlock = Record<string, Record<string, string[]>>;

export interface PolicyDocument {
	version: string;
	statements: PolicyStatement[];
}

/**
 * The runtime context an evaluation is judged against. `currentTime` is injected
 * (never read from the clock inside the engine) so `evaluate()` stays pure.
 */
export interface ConditionContext {
	mfaPresent?: boolean;
	sourceIp?: string;
	currentTime: Date;
	orgId?: string | null;
	resourceOwner?: string | null;
}

export interface EvaluateInput {
	principalArn: string;
	action: string;
	resource: string;
	context: ConditionContext;
	/**
	 * Flattened policies already resolved for this principal, each paired with
	 * the name it resolves under so decisions can name the deciding statement.
	 */
	policies: NamedPolicy[];
}

export interface Decision {
	decision: "allow" | "deny";
	/** Names the deciding statement (sid / policy) — a first-class audit feature. */
	reason: string;
}

/** A policy paired with the name it was resolved under, for reason strings. */
export interface NamedPolicy {
	name: string;
	document: PolicyDocument;
}
