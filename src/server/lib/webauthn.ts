import "server-only";
import type { NextRequest } from "next/server";
import { COOKIE_DOMAIN } from "../constants/environments";
import { Redis } from "../databases/redis";

// === RP (Relying Party) configuration =====================================
//
// WebAuthn binds every credential to an effective domain (the "RP ID"). A
// credential created under RP ID `example.com` cannot be used on
// `other.com`, and Chrome/Safari pin the binding at the OS / iCloud-Keychain
// level. Getting this wrong means users can register a passkey on dev and
// silently re-register a separate one on prod thinking it's the same key.
//
// We derive RP ID from COOKIE_DOMAIN (the same value that controls auth
// cookie scope) so passkey and session cookies share a security boundary:
//   .managerenta.com → managerenta.com
//   localhost        → localhost
// The leading dot is a cookie convention; RP ID must be a bare host name.

const RP_NAME = "manageRenta";

export function getRpId(): string {
	const raw = (COOKIE_DOMAIN || "localhost").trim();
	return raw.startsWith(".") ? raw.slice(1) : raw;
}

// Origin is per-request: the browser-issued WebAuthn assertion is signed
// against the page's origin, and the verifier must compare against the
// actual request origin. We accept any origin whose host is RP ID or a
// subdomain of it — that's the same boundary the browser enforces, just
// mirrored on the server.
export function getExpectedOrigins(req: NextRequest | Request): string[] {
	const rpId = getRpId();
	const origin = req.headers.get("origin");
	if (origin) {
		try {
			const url = new URL(origin);
			const host = url.hostname;
			if (host === rpId || host.endsWith(`.${rpId}`)) {
				return [origin];
			}
		} catch {
			// fall through to the safe default
		}
	}
	// Fallback for tooling that doesn't set Origin (curl, some test
	// runners). Lock to https in prod-like RP IDs; localhost stays http.
	const scheme = rpId === "localhost" ? "http" : "https";
	return [`${scheme}://${rpId}`];
}

export const WEBAUTHN_RP_NAME = RP_NAME;

// === Redis-backed challenge store =========================================
//
// SECURITY: WebAuthn requires server-generated, single-use challenges. If
// you store them client-side or replay them, the whole ceremony collapses
// — an attacker can replay a captured assertion. We use Redis with a
// short TTL (the user has to finish the ceremony in this window) and
// `del`-on-consume so an interrupted ceremony's challenge cannot be reused.

const CHALLENGE_TTL_SECONDS = 5 * 60;

function challengeKey(namespace: string, id: string): string {
	return `webauthn:challenge:${namespace}:${id}`;
}

export interface StoredChallenge {
	challenge: string;
	// Free-form context the verify step needs. For registration we stash
	// the userId; for passwordless auth we don't need anything (the user
	// is identified by the assertion's credentialId).
	context?: Record<string, unknown>;
}

export async function storeChallenge(
	namespace: string,
	id: string,
	value: StoredChallenge,
): Promise<void> {
	await Redis.setex(
		challengeKey(namespace, id),
		CHALLENGE_TTL_SECONDS,
		JSON.stringify(value),
	);
}

export async function consumeChallenge(
	namespace: string,
	id: string,
): Promise<StoredChallenge | null> {
	const key = challengeKey(namespace, id);
	const raw = await Redis.get(key);
	if (!raw) return null;
	// Single-use: delete before returning so a concurrent verify can't
	// replay the same challenge.
	await Redis.del(key);
	try {
		return JSON.parse(raw) as StoredChallenge;
	} catch {
		return null;
	}
}
