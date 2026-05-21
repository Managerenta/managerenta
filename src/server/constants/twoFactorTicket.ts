import { createHash, randomBytes } from "node:crypto";
import { sign, verify } from "jsonwebtoken";
import { JWT_ACCESS_TOKEN_SECRET } from "./environments";

// Short-lived bearer that proves "this user just passed the password step but
// hasn't completed 2FA yet". Issued by /api/auth/login when the account has
// 2FA enabled; consumed by /api/auth/login/2fa. NEVER use this in place of an
// access token — it carries no session, only a one-time challenge identity.

const TICKET_TTL_SECONDS = 5 * 60;
const AUDIENCE = "2fa-challenge";

function ticketSecret(): string {
	// Derive a distinct secret per purpose so a stolen / forged ticket cannot
	// be replayed as an access token (and vice-versa) even if one signing key
	// is shared across both. HKDF would be cleaner but a domain-separated
	// SHA-256 hash is sufficient for HMAC key derivation.
	return createHash("sha256")
		.update(`${JWT_ACCESS_TOKEN_SECRET}:${AUDIENCE}`)
		.digest("hex");
}

export interface TwoFactorTicketPayload {
	userId: string;
	nonce: string;
}

export function signTwoFactorTicket(userId: string): string {
	const payload: TwoFactorTicketPayload = {
		userId,
		nonce: randomBytes(16).toString("hex"),
	};
	return sign({ data: payload }, ticketSecret(), {
		algorithm: "HS256",
		expiresIn: TICKET_TTL_SECONDS,
		audience: AUDIENCE,
	});
}

export function verifyTwoFactorTicket(
	ticket: string,
): TwoFactorTicketPayload | null {
	try {
		const { data } = verify(ticket, ticketSecret(), {
			algorithms: ["HS256"],
			audience: AUDIENCE,
		}) as { data: TwoFactorTicketPayload };
		if (!data?.userId) return null;
		return data;
	} catch {
		return null;
	}
}
