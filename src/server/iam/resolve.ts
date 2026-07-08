import { Redis } from "../databases";
import { parseArn } from "./arn";
import {
	getIamGroupsByIdsDB,
	getIamPoliciesByIdsDB,
	getMembershipsForPrincipalDB,
	isValidPolicyDocument,
} from "./models";
import type { NamedPolicy } from "./types";

// ── Resolution + Redis caching ──────────────────────────────────────────────
// Turning a logged-in identity into a flattened policy set is three indexed
// reads on EVERY request, so it is Redis-cached. Correctness over clever
// fan-out: a policy/group edit bumps a global version counter (orphaning the
// whole old generation at once); a single membership edit deletes one key.

const VERSION_KEY = "iam:policyVersion";
const CACHE_TTL_SECONDS = 5 * 60;

/** Prefix used for the effective-policy cache keys of a given generation. */
function effKey(version: number, principalArn: string): string {
	return `iam:eff:${version}:${principalArn}`;
}

/** Read the current global policy version, defaulting to 0. */
async function currentVersion(): Promise<number> {
	try {
		const raw = await Redis.get(VERSION_KEY);
		const n = raw === null ? 0 : Number(raw);
		return Number.isFinite(n) ? n : 0;
	} catch {
		// Redis down → treat as generation 0. Resolution still works off the DB;
		// only the cache is unavailable.
		return 0;
	}
}

/**
 * Invalidate broadly for a policy or group edit: every subsequent read computes
 * a new cache key, orphaning the entire previous generation (no SCAN, no
 * wildcard delete — atomic). Rare vs. reads, so bluntness is fine.
 */
export async function bumpPolicyVersion(): Promise<void> {
	try {
		await Redis.incr(VERSION_KEY);
	} catch {
		// Best-effort: a failed bump means stale reads expire by TTL instead.
	}
}

/** Invalidate a single principal's current-generation cache entry. */
export async function invalidatePrincipal(principalArn: string): Promise<void> {
	try {
		const version = await currentVersion();
		await Redis.del(effKey(version, principalArn));
	} catch {
		// Best-effort: entry expires by TTL anyway.
	}
}

/**
 * Resolve the flattened, named policy set for a principal:
 *   membership rows → group ids → attached policy ids → policy documents.
 * Cached in Redis under the current generation key. A cache miss falls back to
 * the DB; a hard DB failure returns an empty set so the caller fails closed.
 */
export async function resolveEffectivePolicies(
	principalArn: string,
): Promise<NamedPolicy[]> {
	const version = await currentVersion();
	const key = effKey(version, principalArn);

	const cached = await readCache(key);
	if (cached) return cached;

	const resolved = await resolveFromDb(principalArn);
	await writeCache(key, resolved);
	return resolved;
}

async function readCache(key: string): Promise<NamedPolicy[] | null> {
	try {
		const raw = await Redis.get(key);
		if (raw === null) return null;
		const parsed = JSON.parse(raw) as NamedPolicy[];
		if (!Array.isArray(parsed)) return null;
		return parsed;
	} catch {
		return null;
	}
}

async function writeCache(key: string, value: NamedPolicy[]): Promise<void> {
	try {
		await Redis.setex(key, CACHE_TTL_SECONDS, JSON.stringify(value));
	} catch {
		// Cache write failure is non-fatal — the DB result is already correct.
	}
}

async function resolveFromDb(principalArn: string): Promise<NamedPolicy[]> {
	const parsed = parseArn(principalArn);
	if (!parsed.valid) return [];

	const principalType = parsed.type === "operator" ? "operator" : "user";
	const principalId = parsed.id;
	// Platform operators are org-agnostic (orgId `*` in the ARN → null scope);
	// org users are scoped to their org id.
	const orgId =
		parsed.plane === "platform" || parsed.orgId === "*"
			? null
			: parsed.orgId;

	const memberships = await getMembershipsForPrincipalDB({
		principalType,
		principalId,
		orgId,
	});
	if (memberships.length === 0) return [];

	const groupIds = dedupeIds(memberships.map((m) => m.groupId.toString()));
	const groups = await getIamGroupsByIdsDB({ ids: groupIds });
	if (groups.length === 0) return [];

	const policyIds = dedupeIds(
		groups.flatMap((g) => g.attachedPolicyIds.map((id) => id.toString())),
	);
	if (policyIds.length === 0) return [];

	const policies = await getIamPoliciesByIdsDB({ ids: policyIds });

	// Only well-formed documents reach the engine (defence in depth alongside
	// the Zod gate on write).
	return policies
		.filter((p) => isValidPolicyDocument(p.document))
		.map((p) => ({ name: p.name, document: p.document }));
}

function dedupeIds(ids: string[]): string[] {
	return Array.from(new Set(ids));
}
