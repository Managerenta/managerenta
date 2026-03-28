import { jwtVerify } from "jose";
import { type NextRequest, NextResponse } from "next/server";

const PROTECTED_ROUTES = [
	"/dashboard",
	"/properties",
	"/settings",
	"/add-transaction",
	"/tenants",
];

const AUTH_ROUTES = ["/login", "/signup", "/"];

function isProtectedRoute(pathname: string): boolean {
	return PROTECTED_ROUTES.some(
		(route) => pathname === route || pathname.startsWith(`${route}/`),
	);
}

async function checkAuth(cookieHeader: string): Promise<boolean> {
	const match = cookieHeader.match(/accessToken=([^;]+)/);
	const token = match?.[1];
	if (!token) return false;

	try {
		await jwtVerify(
			token,
			new TextEncoder().encode(process.env.JWT_ACCESS_TOKEN_SECRET),
		);
		return true;
	} catch {
		return false;
	}
}

export async function proxy(request: NextRequest) {
	const { pathname } = request.nextUrl;
	const cookieHeader = request.headers.get("cookie") ?? "";
	const hasVisited = request.cookies.has("pt_visited");

	const isAuthenticated = await checkAuth(cookieHeader);

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
