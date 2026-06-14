import { createHash } from "node:crypto";
import { sign, verify } from "jsonwebtoken";
import { JWT_ACCESS_TOKEN_SECRET } from "./environments";

// Long-lived, read-mostly bearer that lets a tenant open their self-service
// portal from a shared link without a full account. It authorises ONLY the
// portal endpoints for one tenant — never treat it as a user access token.

const TOKEN_TTL_SECONDS = 365 * 24 * 60 * 60;
const AUDIENCE = "tenant-portal";

function portalSecret(): string {
	// Domain-separated key so a portal token can't be replayed as an access
	// token (and vice-versa), mirroring the 2FA-ticket derivation.
	return createHash("sha256")
		.update(`${JWT_ACCESS_TOKEN_SECRET}:${AUDIENCE}`)
		.digest("hex");
}

export interface TenantPortalTokenPayload {
	tenantId: string;
	ownerId: string;
}

export function signTenantPortalToken(
	payload: TenantPortalTokenPayload,
): string {
	return sign({ data: payload }, portalSecret(), {
		algorithm: "HS256",
		expiresIn: TOKEN_TTL_SECONDS,
		audience: AUDIENCE,
	});
}

export function verifyTenantPortalToken(
	token: string,
): TenantPortalTokenPayload | null {
	try {
		const { data } = verify(token, portalSecret(), {
			algorithms: ["HS256"],
			audience: AUDIENCE,
		}) as { data: TenantPortalTokenPayload };
		if (!data?.tenantId || !data?.ownerId) return null;
		return data;
	} catch {
		return null;
	}
}
