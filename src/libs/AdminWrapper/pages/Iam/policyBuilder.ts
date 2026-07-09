import { ACTION_MAP, arn, SERVICES, type Service } from "@/server/iam/arn";
import type { PolicyDocument, PolicyStatement } from "@/server/iam/types";

// ── Friendly policy builder model ────────────────────────────────────────────
// A non-technical admin thinks in terms of "what can this policy touch, and how
// much". We model that as a per-service 3-way choice — Off / Read-only / Full —
// and compile it deterministically into a real platform-plane policy document
// built from the SAME closed catalogue the engine authorizes against (arn.ts).
// The reverse mapping lets an existing document reopen in the builder when it
// was authored by the builder; anything hand-crafted opens in Advanced/JSON so
// nothing is silently rewritten.

export type ServiceAccess = "off" | "read" | "full";
export type BuilderSelections = Partial<Record<Service, ServiceAccess>>;

/** Every service the builder can toggle, in catalogue order. */
export const BUILDER_SERVICES: readonly Service[] = SERVICES;

/** Version stamped on generated documents (matches the system-policy version). */
export const POLICY_BUILDER_VERSION = "2026-01-01";

/** Title-cased, human display label for each service. */
export const SERVICE_LABELS: Record<Service, string> = {
	properties: "Properties",
	units: "Units",
	tenants: "Tenants",
	documents: "Documents",
	maintenance: "Maintenance",
	vendors: "Vendors",
	analytics: "Analytics",
	calendar: "Calendar",
	audit: "Audit log",
	notifications: "Notifications",
	organizations: "Organizations",
	users: "Users",
	billing: "Billing",
	iam: "Access control (IAM)",
	settings: "Settings",
};

function sidFor(service: Service, access: "read" | "full"): string {
	const head = service.charAt(0).toUpperCase() + service.slice(1);
	return `${head}${access === "full" ? "Full" : "Read"}`;
}

/** The read-only action set for a service = {Read, List} ∩ its catalogue. */
export function readActionsFor(service: Service): string[] {
	return ["Read", "List"]
		.filter((verb) =>
			(ACTION_MAP[service] as readonly string[]).includes(verb),
		)
		.map((verb) => `${service}:${verb}`);
}

function platformResourceFor(service: Service): string {
	return arn.platform[service]();
}

/**
 * Compile builder selections into a policy document. Off services are omitted;
 * Read-only emits the service's `Read`/`List` verbs; Full emits `service:*`.
 * Each service becomes its own Allow statement so the mapping is reversible.
 */
export function buildDocumentFromSelections(
	selections: BuilderSelections,
): PolicyDocument {
	const statements: PolicyStatement[] = [];
	for (const service of SERVICES) {
		const access = selections[service] ?? "off";
		if (access === "off") continue;
		const action =
			access === "full" ? [`${service}:*`] : readActionsFor(service);
		if (action.length === 0) continue;
		statements.push({
			sid: sidFor(service, access),
			effect: "Allow",
			action,
			resource: [platformResourceFor(service)],
		});
	}
	return { version: POLICY_BUILDER_VERSION, statements };
}

export interface ParseResult {
	selections: BuilderSelections;
	/** True only when EVERY statement maps cleanly onto the builder model. */
	exact: boolean;
}

function arraysEqual(a: string[], b: string[]): boolean {
	return a.length === b.length && a.every((v, i) => v === b[i]);
}

/**
 * Best-effort reverse of {@link buildDocumentFromSelections}. Captures whatever
 * maps onto the Off/Read/Full model and flags `exact:false` for anything that
 * does not (Deny statements, conditions, multi-resource statements, unknown
 * ARNs, or mixed action sets) so the caller can fall back to the JSON editor.
 */
export function parseSelectionsFromDocument(document: unknown): ParseResult {
	const selections: BuilderSelections = {};
	const doc = document as PolicyDocument | null;
	if (!doc || typeof doc !== "object" || !Array.isArray(doc.statements)) {
		return { selections, exact: false };
	}

	const resourceToService = new Map<string, Service>();
	for (const service of SERVICES) {
		resourceToService.set(platformResourceFor(service), service);
	}

	let exact = true;
	for (const st of doc.statements) {
		if (
			!st ||
			st.effect !== "Allow" ||
			st.condition ||
			!Array.isArray(st.resource) ||
			st.resource.length !== 1 ||
			!Array.isArray(st.action)
		) {
			exact = false;
			continue;
		}
		const service = resourceToService.get(st.resource[0] as string);
		if (!service) {
			exact = false;
			continue;
		}
		const actions = [...(st.action as string[])].sort();
		const isFull = actions.length === 1 && actions[0] === `${service}:*`;
		const readSet = readActionsFor(service).sort();
		const isRead = arraysEqual(actions, readSet);
		if (isFull) {
			selections[service] = "full";
		} else if (isRead) {
			selections[service] = "read";
		} else {
			exact = false;
		}
	}
	return { selections, exact };
}
