import type { IResponseData } from "@/types";

export async function DELETE() {
	try {
		const headers = new Headers();
		const cookie_domain = process.env.COOKIE_DOMAIN || "gkoi.com";

		headers.set("content-type", "application/json");
		headers.set("Location", "/"); // Redirect to home page to trigger reload

		// Clear accessToken cookie
		headers.append(
			"Set-Cookie",
			`accessToken=; Path=/; HttpOnly; SameSite=Strict; Secure; Max-Age=0; Domain=${cookie_domain}`,
		);

		// Clear refreshToken cookie
		headers.append(
			"Set-Cookie",
			`refreshToken=; Path=/; HttpOnly; SameSite=Strict; Secure; Max-Age=0; Domain=${cookie_domain}`,
		);

		const origin = process.env.APP_HOSTNAME || "https://www.gkoi.com";
		headers.set("Origin", origin);

		const responseData: IResponseData<null> = {
			data: null,
			message: "Logout successful",
			code: 302, // Changed to 302 for redirect
		};

		return new Response(JSON.stringify(responseData), {
			status: responseData.code,
			statusText: "Found",
			headers,
		});
	} catch {
		const errorData: IResponseData<null> = {
			data: null,
			message: "Logout failed",
			code: 500,
		};

		return new Response(JSON.stringify(errorData), {
			status: errorData.code,
			headers: { "content-type": "application/json" },
		});
	}
}
