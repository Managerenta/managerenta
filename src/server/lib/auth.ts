import "server-only";
import type { NextRequest } from "next/server";
import { decodeJwtToken, ErrInvalidAction } from "../constants";
import { reLoginUserWithRefreshToken } from "../services";
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
		return {
			userId: decodedAccessToken.userId,
			token: decodedAccessToken,
			refreshed: false,
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

	return { userId, token: next, refreshed: true };
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
