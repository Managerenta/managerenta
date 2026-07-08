import type { Plane } from "./types";

// ── Closed sets ─────────────────────────────────────────────────────────────
// Both the resource-naming scheme and the verb vocabulary are closed sets
// defined here in code, so a typo cannot silently widen access. Route handlers
// build ARNs and actions through these helpers, not from raw strings.

export const IAM_NAMESPACE = "mr";

export const PLANES = ["platform", "org"] as const;

export const SERVICES = [
	"properties",
	"units",
	"tenants",
	"documents",
	"maintenance",
	"vendors",
	"analytics",
	"calendar",
	"audit",
	"notifications",
	"organizations",
	"users",
	"billing",
	"iam",
	"settings",
] as const;

export type Service = (typeof SERVICES)[number];

/** The resource-type noun each service names its objects with. */
export const RESOURCE_TYPE: Record<Service, string> = {
	properties: "property",
	units: "unit",
	tenants: "tenant",
	documents: "document",
	maintenance: "request",
	vendors: "vendor",
	analytics: "report",
	calendar: "event",
	audit: "event",
	notifications: "notification",
	organizations: "organization",
	users: "user",
	billing: "invoice",
	iam: "resource",
	settings: "config",
};

const CRUD = ["Read", "List", "Create", "Update", "Delete"] as const;

/**
 * The verbs each service exposes. Standard CRUD plus service-specific verbs
 * where a route is not plain CRUD. This is the authoritative action catalogue.
 */
export const ACTION_MAP: Record<Service, readonly string[]> = {
	properties: CRUD,
	units: CRUD,
	tenants: [...CRUD, "SendReminder", "GeneratePortalLink"],
	documents: CRUD,
	maintenance: CRUD,
	vendors: CRUD,
	analytics: ["Read", "List"],
	calendar: CRUD,
	audit: ["Read", "List"],
	notifications: [...CRUD, "Send"],
	organizations: [
		...CRUD,
		"InviteMember",
		"RemoveMember",
		"Switch",
		"Suspend",
	],
	users: ["Read", "List", "Update", "Delete"],
	billing: ["Read", "List", "Update"],
	iam: [
		"Read",
		"List",
		"CreateGroup",
		"DeleteGroup",
		"PutPolicy",
		"DeletePolicy",
		"AttachPolicy",
		"DetachPolicy",
		"AddMember",
		"RemoveMember",
		"CreateOperator",
		"DisableOperator",
	],
	settings: ["Read", "Update"],
};

/** Every concrete `service:Verb` action string, as a flat frozen list. */
export const ACTIONS: readonly string[] = Object.freeze(
	SERVICES.flatMap((service) =>
		ACTION_MAP[service].map((verb) => `${service}:${verb}`),
	),
);

const ACTION_SET = new Set(ACTIONS);

/**
 * The concrete-action type consumers pass to `authorize()`. Kept as a branded
 * string alias rather than a giant literal union to keep editor performance
 * sane, but validated at runtime by {@link isAction}.
 */
export type Action = string & { readonly __action?: unique symbol };

/** True when `value` is one of the concrete actions in the closed catalogue. */
export function isAction(value: string): value is Action {
	return ACTION_SET.has(value);
}

/** Narrow an arbitrary string to an Action, throwing if it is not in the set. */
export function assertAction(value: string): Action {
	if (!ACTION_SET.has(value)) {
		throw new Error(`Unknown IAM action: ${value}`);
	}
	return value as Action;
}

// ── ARN construction ────────────────────────────────────────────────────────
// Format: mr:{plane}:{service}:{orgId|*}:{type}/{id|*}

/** Low-level builder. Prefer the typed `arn` helpers below in route code. */
export function resourceArn(
	plane: Plane,
	service: Service,
	orgId: string,
	id: string = "*",
	type: string = RESOURCE_TYPE[service],
): string {
	return `${IAM_NAMESPACE}:${plane}:${service}:${orgId}:${type}/${id}`;
}

export type OrgArnBuilder = (orgId: string, id?: string) => string;
export type PlatformArnBuilder = (id?: string, orgId?: string) => string;

function buildOrgArnBuilders(): Record<Service, OrgArnBuilder> {
	const out = {} as Record<Service, OrgArnBuilder>;
	for (const service of SERVICES) {
		out[service] = (orgId: string, id: string = "*") =>
			resourceArn("org", service, orgId, id);
	}
	return out;
}

function buildPlatformArnBuilders(): Record<Service, PlatformArnBuilder> {
	const out = {} as Record<Service, PlatformArnBuilder>;
	for (const service of SERVICES) {
		out[service] = (id: string = "*", orgId: string = "*") =>
			resourceArn("platform", service, orgId, id);
	}
	return out;
}

/**
 * Typed ARN builders. `arn.org.<service>(orgId, id?)` for tenant resources;
 * `arn.platform.<service>(id?, orgId?)` for platform-plane resources.
 *
 * @example arn.org.audit(orgId)                 // mr:org:audit:{orgId}:event/*
 * @example arn.org.properties(orgId, propId)    // mr:org:properties:{orgId}:property/{propId}
 * @example arn.platform.organizations()         // mr:platform:organizations:*:organization/*
 */
export const arn = {
	org: buildOrgArnBuilders(),
	platform: buildPlatformArnBuilders(),
} as const;

// ── Principal ARNs ──────────────────────────────────────────────────────────
// Identity ARNs. Their `plane` segment drives cross-plane isolation in the
// engine: an org principal can only ever match org-plane resources, and a
// platform operator only platform-plane resources.

/** mr:org:iam:{orgId}:user/{userId} */
export function principalArnForUser(orgId: string, userId: string): string {
	return resourceArn("org", "iam", orgId, userId, "user");
}

/** mr:platform:iam:*:operator/{userId} */
export function principalArnForOperator(userId: string): string {
	return resourceArn("platform", "iam", "*", userId, "operator");
}

export interface ParsedArn {
	namespace: string;
	plane: string;
	service: string;
	orgId: string;
	type: string;
	id: string;
	/** True only when the string is a well-formed 5-field ARN with a type/id tail. */
	valid: boolean;
}

/**
 * Parse an ARN into its segments. Never throws — a malformed string yields
 * `valid: false` so callers (and the engine) can fail closed.
 */
export function parseArn(value: string): ParsedArn {
	const empty: ParsedArn = {
		namespace: "",
		plane: "",
		service: "",
		orgId: "",
		type: "",
		id: "",
		valid: false,
	};
	if (typeof value !== "string") return empty;
	const fields = value.split(":");
	if (fields.length !== 5) return empty;
	const [namespace, plane, service, orgId, tail] = fields as [
		string,
		string,
		string,
		string,
		string,
	];
	const slash = tail.indexOf("/");
	if (slash < 0) return empty;
	const type = tail.slice(0, slash);
	const id = tail.slice(slash + 1);
	if (namespace !== IAM_NAMESPACE || !plane || !service || !type || !id) {
		return { namespace, plane, service, orgId, type, id, valid: false };
	}
	return { namespace, plane, service, orgId, type, id, valid: true };
}
