import "server-only";
import type { NextRequest } from "next/server";
import { ErrForbidden } from "../constants";
import type { AuthResult } from "../lib/auth";
import { getClientIp } from "../lib/clientIp";
import { createAuditEventDB } from "../models/audit";
import {
	type Action,
	parseArn,
	principalArnForOperator,
	principalArnForUser,
} from "./arn";
import { evaluate } from "./engine";
import { getIamOperatorByUserIdDB } from "./models";
import { resolveEffectivePolicies } from "./resolve";
import type { ConditionContext, Decision, NamedPolicy } from "./types";

/**
 * The orgId slot to stamp into a resource ARN for the caller's current authz
 * scope. In an organization it is the org id (the seeded org policies are baked
 * with it); in personal scope it is the user's own id (the in-engine
 * `selfScopePolicy` is baked on the user id). Domain route handlers build
 * resources as `arn.org.SERVICE(resourceScope(auth), id)` so a single
 * evaluation path covers both scopes.
 */
export function resourceScope(auth: AuthResult): string {
	return auth.organizationId ?? auth.userId;
}

export interface AuthorizeOverrides {
	sourceIp?: string;
	mfaPresent?: boolean;
	resourceOwner?: string | null;
	currentTime?: Date;
	/** When present, sourceIp/mfa are derived from the request unless overridden. */
	req?: Request | NextRequest;
}

/**
 * The single authorization guard. Replaces `assertOrganizationAdmin`,
 * `assertOrganizationAdminOrManager`, `assertWriteRole`, and inline role
 * checks. Resolves the principal's effective policies (cached), builds the
 * per-request condition context, evaluates, and throws `ErrForbidden` (403) on
 * any non-allow — with the engine's reason written to the audit log (never
 * leaked to the client).
 */
export async function authorize(
	auth: AuthResult,
	action: Action,
	resourceArn: string,
	overrides: AuthorizeOverrides = {},
): Promise<void> {
	const result = await decide(auth, action, resourceArn, overrides);
	if (result.decision !== "allow") {
		await logDenial(auth, action, resourceArn, result, overrides);
		throw ErrForbidden;
	}
}

/**
 * Non-throwing variant — returns the full decision (used by shadow-mode
 * comparison and tests). `authorize()` is the thin throwing wrapper over this.
 */
export async function decide(
	auth: AuthResult,
	action: Action,
	resourceArn: string,
	overrides: AuthorizeOverrides = {},
): Promise<Decision> {
	const target = parseArn(resourceArn);
	if (!target.valid) {
		return {
			decision: "deny",
			reason: "implicit deny (malformed resource)",
		};
	}

	// Tenant-isolation boundary: an org-plane request may only ever target the
	// caller's own authz scope (their org, or their own id in personal scope).
	// This holds regardless of policy *content*, so a customer policy carrying a
	// wildcard resource (e.g. `mr:org:*:*:*/*`) can never reach another tenant's
	// resources. Platform-plane requests are exempt (operators are org-agnostic).
	if (target.plane === "org" && target.orgId !== resourceScope(auth)) {
		return {
			decision: "deny",
			reason: "implicit deny (cross-scope org resource)",
		};
	}

	const principal = await buildPrincipal(auth, target.plane);
	if (!principal) {
		return {
			decision: "deny",
			reason: "implicit deny (no eligible principal for plane)",
		};
	}

	const context = buildContext(auth, target.orgId, overrides);
	return evaluate({
		principalArn: principal.principalArn,
		action,
		resource: resourceArn,
		context,
		policies: principal.policies,
	});
}

interface ResolvedPrincipal {
	principalArn: string;
	policies: NamedPolicy[];
}

async function buildPrincipal(
	auth: AuthResult,
	resourcePlane: string,
): Promise<ResolvedPrincipal | null> {
	if (resourcePlane === "platform") {
		// Platform access requires an active operator identity, never an ordinary
		// tenant user. A disabled operator is denied before any policy lookup.
		const operator = await getIamOperatorByUserIdDB({
			userId: auth.userId,
		});
		if (!operator || operator.status !== "active") return null;
		const principalArn = principalArnForOperator(auth.userId);
		return {
			principalArn,
			policies: await resolveEffectivePolicies(principalArn),
		};
	}

	// Org plane. Personal scope (no organization) grants the user implicit,
	// self-scoped admin over their own resources via an in-memory policy — one
	// evaluation path for all authz, no hardcoded decision branch in the engine.
	if (!auth.organizationId) {
		const principalArn = principalArnForUser(auth.userId, auth.userId);
		return { principalArn, policies: [selfScopePolicy(auth.userId)] };
	}

	const principalArn = principalArnForUser(auth.organizationId, auth.userId);
	return {
		principalArn,
		policies: await resolveEffectivePolicies(principalArn),
	};
}

/** Grants a personal-scope user full control of resources under their own id. */
function selfScopePolicy(userId: string): NamedPolicy {
	return {
		name: "PersonalScope",
		document: {
			version: "2026-01-01",
			statements: [
				{
					sid: "SelfOwner",
					effect: "Allow",
					action: ["*"],
					resource: [`mr:org:*:${userId}:*/*`],
				},
			],
		},
	};
}

/**
 * Build the condition context. `currentTime` is read from the server clock
 * HERE (injected into the pure engine) so the engine never reads a clock.
 */
export function buildContext(
	auth: AuthResult,
	resourceOrgId: string,
	overrides: AuthorizeOverrides,
): ConditionContext {
	const tokenMfa = (auth.token as { mfaPresent?: boolean } | undefined)
		?.mfaPresent;
	const sourceIp =
		overrides.sourceIp ??
		(overrides.req ? getClientIp(overrides.req) : undefined);
	return {
		currentTime: overrides.currentTime ?? new Date(),
		mfaPresent: overrides.mfaPresent ?? tokenMfa ?? false,
		sourceIp,
		orgId: auth.organizationId ?? undefined,
		resourceOwner:
			overrides.resourceOwner ??
			(resourceOrgId && resourceOrgId !== "*"
				? resourceOrgId
				: undefined),
	};
}

async function logDenial(
	auth: AuthResult,
	action: string,
	resourceArn: string,
	result: Decision,
	overrides: AuthorizeOverrides,
): Promise<void> {
	// Audit is best-effort and must never turn a 403 into a 500.
	try {
		await createAuditEventDB({
			payload: {
				ownerId: auth.effectiveOwnerId,
				actorId: auth.userId,
				organizationId: auth.organizationId ?? undefined,
				action: "authz-deny",
				entityType: "iam",
				description: result.reason,
				metadata: { action, resource: resourceArn },
				ip:
					overrides.sourceIp ??
					(overrides.req ? getClientIp(overrides.req) : undefined),
			},
		});
	} catch {
		// swallow — denial still returns 403
	}
}
