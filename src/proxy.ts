import { type NextRequest, NextResponse } from "next/server";

const PROTECTED_ROUTES = [
	"/dashboard",
	"/properties",
	"/settings",
	"/add-transaction",
	"/tenants",
	"/notifications",
	"/invitations",
];

const AUTH_ROUTES = ["/login", "/signup", "/"];

function isProtectedRoute(pathname: string): boolean {
	return PROTECTED_ROUTES.some(
		(route) => pathname === route || pathname.startsWith(`${route}/`),
	);
}

function hasSessionCookie(request: NextRequest): boolean {
	return (
		request.cookies.has("accessToken") ||
		request.cookies.has("refreshToken")
	);
}

export async function proxy(request: NextRequest) {
	const { pathname } = request.nextUrl;
	const hasVisited = request.cookies.has("pt_visited");

	const isAuthenticated = hasSessionCookie(request);

	if (isAuthenticated && AUTH_ROUTES.includes(pathname)) {
		return NextResponse.redirect(new URL("/dashboard", request.url));
	}

	if (!isAuthenticated && isProtectedRoute(pathname)) {
		return NextResponse.redirect(new URL("/login", request.url));
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
