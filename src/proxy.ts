import { jwtVerify } from "jose";
import { type NextRequest, NextResponse } from "next/server";

// Page-shell gate. Runs on every non-API request and enforces three rules:
//   1. Protected pages require a verified access token, OR an opaque refresh
//      cookie (the page's auth bootstrap will swap it for a fresh access
//      token via /api/auth/verify).
//   2. Pure auth pages (/login, /signup, /) bounce already-authenticated
//      users to /dashboard.
//   3. Unauthenticated requests to /, /signup remember a one-shot "have
//      seen the signup page" cookie so the next visit lands on /login.
//
// SECURITY NOTE — see SECURITY_REVIEW.md M2 / S5.
// Until this rewrite the gate only checked cookie *presence*. An attacker
// could trivially set `accessToken=garbage` to defeat the redirect. This
// version verifies the JWT signature using `jose` (edge-compatible) so a
// junk cookie no longer passes. Real data fetches are still gated at the
// API layer by `withAuth`; this gate exists to suppress empty page shells
// and to avoid leaking auth-only routes into search indexes.

const PROTECTED_ROUTES = [
	"/dashboard",
	"/properties",
	"/settings",
	"/tenants",
	"/notifications",
	"/invitations",
];

const AUTH_ROUTES = ["/login", "/signup", "/"];

const ACCESS_COOKIE = "accessToken";
const REFRESH_COOKIE = "refreshToken";

function isProtectedRoute(pathname: string): boolean {
	return PROTECTED_ROUTES.some(
		(route) => pathname === route || pathname.startsWith(`${route}/`),
	);
}

// Lazily-encoded key so we read process.env once per process and don't pay
// the TextEncoder cost on every request.
let cachedKey: Uint8Array | null = null;
function getAccessSecret(): Uint8Array | null {
	if (cachedKey) return cachedKey;
	const secret = process.env.JWT_ACCESS_TOKEN_SECRET;
	if (!secret || secret.length < 32) return null;
	cachedKey = new TextEncoder().encode(secret);
	return cachedKey;
}

async function hasValidAccessToken(token: string): Promise<boolean> {
	const key = getAccessSecret();
	if (!key) return false;
	try {
		await jwtVerify(token, key, { algorithms: ["HS256"] });
		return true;
	} catch {
		return false;
	}
}

async function resolveAuthState(
	request: NextRequest,
): Promise<"authenticated" | "may-refresh" | "anonymous"> {
	const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
	if (accessToken && (await hasValidAccessToken(accessToken))) {
		return "authenticated";
	}
	// We can't validate the refresh token at the edge (that requires a DB
	// round-trip). If it's present, allow the page through; the client's
	// boot path will exchange it for a fresh access token. If it's also
	// missing or junk, the request is anonymous.
	if (request.cookies.has(REFRESH_COOKIE)) return "may-refresh";
	return "anonymous";
}

function buildLoginRedirect(request: NextRequest, pathname: string): URL {
	const url = new URL("/login", request.url);
	// Preserve the original path so the user lands where they were headed.
	// Only the path+search is preserved (not host/scheme) so this can never
	// become an open redirect.
	const original = `${pathname}${request.nextUrl.search}`;
	if (original && original !== "/" && original !== "/login") {
		url.searchParams.set("next", original);
	}
	return url;
}

export async function proxy(request: NextRequest) {
	const { pathname } = request.nextUrl;
	const hasVisited = request.cookies.has("pt_visited");
	const state = await resolveAuthState(request);
	const isAuthenticated = state !== "anonymous";

	if (isAuthenticated && AUTH_ROUTES.includes(pathname)) {
		return NextResponse.redirect(new URL("/dashboard", request.url));
	}

	if (!isAuthenticated && isProtectedRoute(pathname)) {
		return NextResponse.redirect(buildLoginRedirect(request, pathname));
	}

	if (!isAuthenticated && pathname === "/") {
		const destination = hasVisited ? "/login" : "/signup";
		return NextResponse.redirect(new URL(destination, request.url));
	}

	if (!isAuthenticated && pathname === "/signup") {
		const response = NextResponse.next();
		if (!hasVisited) {
			response.cookies.set("pt_visited", "true", {
				httpOnly: true,
				maxAge: 365 * 24 * 60 * 60,
				path: "/",
				sameSite: "lax",
			});
		}
		return response;
	}

	return NextResponse.next();
}

export const config = {
	matcher: [
		"/((?!api|_next/static|_next/image|favicon.ico|manifest.json|robots.txt).*)",
	],
};
