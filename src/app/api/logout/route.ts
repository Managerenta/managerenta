import type { IResponseData } from "@/types";

export async function DELETE() {
	try {
		const headers = new Headers();
		headers.set("content-type", "application/json");

		const cookieDomain = process.env.COOKIE_DOMAIN || "";
		const domainAttr = cookieDomain ? `; Domain=${cookieDomain}` : "";

		headers.append(
			"Set-Cookie",
			`accessToken=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${domainAttr}`,
		);
		headers.append(
			"Set-Cookie",
			`refreshToken=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${domainAttr}`,
		);

		const responseData: IResponseData<null> = {
			data: null,
			message: "Logout successful",
			code: 200,
		};

		return new Response(JSON.stringify(responseData), {
			status: 200,
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
