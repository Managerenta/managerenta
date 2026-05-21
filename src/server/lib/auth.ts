import "server-only";
import type { NextRequest } from "next/server";
import { decodeJwtToken, ErrInvalidAction } from "../constants";
import { getOrganizationByIdDB } from "../models";
import { IOrganizationRole } from "../models/organizations/types";
import { reLoginUserWithRefreshToken } from "../services";
import getUserById from "../services/users/getUserById";
import type { IJwtPayload } from "../types";
import { getClientIp } from "./clientIp";
import {
	ACCESS_COOKIE,
	clearAuthCookies,
	getCookieValue,
	REFRESH_COOKIE,
	setAuthCookies,
} from "./cookies";

export interface AuthResult {
	userId: string;
	token: IJwtPayload;
	/** True when the access token was refreshed during this request. */
	refreshed: boolean;
	/**
	 * The user ID whose data this request scopes to. Equals `userId` when the
	 * user is operating in their personal scope. When the user has switched
	 * to an organization, this is the org owner's userId — so members of an
	 * org transparently see and modify the org owner's resources.
	 */
	effectiveOwnerId: string;
	organizationId: string | null;
	role: IOrganizationRole | null;
}

function readAccessToken(req: Request | NextRequest, cookieVal: string | null) {
	if (cookieVal) return cookieVal;
	const header = req.headers.get("authorization");
	if (!header) return null;
	return header.replace("Bearer ", "");
}

/**
 * Verify the current request's auth. Returns the decoded payload and userId,
 * refreshing the access token from the refresh token if necessary. Throws on
 * any failure — callers should rely on `withAuth` or handle the error.
 *
 * When `refreshed` is true, the route handler should call `setAuthCookies`
 * on the new token before returning a response so the client picks them up.
 */
export async function verifyAuthToken(
	req: Request | NextRequest,
): Promise<AuthResult> {
	const accessFromCookie = await getCookieValue(ACCESS_COOKIE);
	const accessToken = readAccessToken(req, accessFromCookie);

	const decodedAccessToken = accessToken
		? await decodeJwtToken({ accessToken }).catch(() => null)
		: null;

	if (decodedAccessToken) {
		const scope = await resolveOrgScope(decodedAccessToken.userId);
		return {
			userId: decodedAccessToken.userId,
			token: decodedAccessToken,
			refreshed: false,
			...scope,
		};
	}

	const refreshToken = await getCookieValue(REFRESH_COOKIE);
	if (!refreshToken) throw ErrInvalidAction;

	const decodedRefresh = await decodeJwtToken({ refreshToken });
	if (!decodedRefresh) throw ErrInvalidAction;

	const { userId, ip } = decodedRefresh;
	const next = await reLoginUserWithRefreshToken({
		id: userId,
		refreshToken,
		ip: ip || getClientIp(req),
	});
	if (!next) throw ErrInvalidAction;

	const scope = await resolveOrgScope(userId);
	return { userId, token: next, refreshed: true, ...scope };
}

async function resolveOrgScope(userId: string): Promise<{
	effectiveOwnerId: string;
	organizationId: string | null;
	role: IOrganizationRole | null;
}> {
	try {
		const user = await getUserById({ id: userId });
		const orgId = user?.currentOrganizationId;
		if (!orgId) {
			return {
				effectiveOwnerId: userId,
				organizationId: null,
				role: null,
			};
		}
		const org = await getOrganizationByIdDB({ id: orgId });
		if (!org) {
			return {
				effectiveOwnerId: userId,
				organizationId: null,
				role: null,
			};
		}
		// If the caller is the org owner, role is implicitly admin.
		const ownerId = org.ownerId.toString();
		if (ownerId === userId) {
			return {
				effectiveOwnerId: ownerId,
				organizationId: orgId,
				role: IOrganizationRole.ADMIN,
			};
		}
		const member = org.members?.find(
			(m) => m.memberId.toString() === userId,
		);
		if (!member) {
			// User has a stale currentOrganizationId — fall back to personal scope
			return {
				effectiveOwnerId: userId,
				organizationId: null,
				role: null,
			};
		}
		return {
			effectiveOwnerId: ownerId,
			organizationId: orgId,
			role: member.permission,
		};
	} catch {
		return { effectiveOwnerId: userId, organizationId: null, role: null };
	}
}

export function assertWriteRole(auth: AuthResult): void {
	// Personal scope or org owner ⇒ always allowed.
	if (!auth.organizationId || auth.role === IOrganizationRole.ADMIN) return;
	if (auth.role === IOrganizationRole.MANAGER) return;
	throw ErrInvalidAction;
}

/**
 * Wrap a route handler with auth. The handler receives the resolved user and
 * a `req` reference. If the token was refreshed, new cookies are set on the
 * response automatically before it is returned.
 */
export type AuthedHandler<TCtx = unknown> = (args: {
	req: NextRequest;
	auth: AuthResult;
	context: TCtx;
}) => Promise<Response> | Response;

export function withAuth<TCtx = unknown>(
	handler: AuthedHandler<TCtx>,
): (args: { req: NextRequest; context: TCtx }) => Promise<Response> {
	return async ({ req, context }) => {
		let auth: AuthResult;
		try {
			auth = await verifyAuthToken(req);
		} catch (error) {
			await clearAuthCookies();
			const { handleError } = await import("./response");
			return handleError(error);
		}
		const response = await handler({ req, auth, context });
		if (auth.refreshed) {
			await setAuthCookies(auth.token);
		}
		return response;
	};
}
