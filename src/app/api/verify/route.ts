import { defaultEnvOptions, getAuthCookieOptions } from "@/constants";
import type { IResponseData } from "@/types";

function _removeAuthCookies(headers: Headers) {
	headers.set("content-type", "application/json");

	headers.append(
		"Set-Cookie",
		"accessToken=; Path=/; HttpOnly; SameSite=Strict; Secure; Max-Age=0;",
	);
	headers.append(
		"Set-Cookie",
		"refreshToken=; Path=/; HttpOnly; SameSite=Strict; Secure; Max-Age=0;",
	);
	return headers;
}

async function _verifyTokens({
	allCookiesHeader,
}: {
	allCookiesHeader: string;
}): Promise<Response | null> {
	try {
		const { MAIN_SERVICE_URL } = defaultEnvOptions();
		const url = `${MAIN_SERVICE_URL}/api/auth/verify`;

		const response = await fetch(url, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Cookie: allCookiesHeader,
				// Origin:
				// 	req.headers.get("origin") ||
				// 	process.env.APP_HOSTNAME ||
				// 	"https://www.gkoi.com",
			},
		});

		if (response.status !== 200) return null;
		return response;
	} catch (_error) {
		return null;
	}
}

export async function GET(req: Request) {
	const responseData: IResponseData<null> = {
		// data: {
		// 	account: data.account,
		// },
		message: "Login successful",
		code: 200,
	};

	const headers = new Headers();
	headers.set("content-type", "application/json");

	try {
		const existingCookies = req.headers.get("cookie") || "";
		const existingAccessToken = existingCookies
			.split(";")
			.find((cookie) => cookie.trim().startsWith("accessToken="))
			?.split("=")[1];

		const existingRefreshToken = existingCookies
			.split(";")
			.find((cookie) => cookie.trim().startsWith("refreshToken="))
			?.split("=")[1];

		if (!existingRefreshToken) {
			const responseData: IResponseData<null> = {
				message: "Refresh token missing",
				code: 400,
				data: null,
			};

			return new Response(JSON.stringify(responseData), {
				status: responseData.code,
				statusText: responseData.message || "Refresh token missing",
				headers: _removeAuthCookies(headers),
			});
		}

		const response = await _verifyTokens({
			allCookiesHeader: existingCookies,
		});

		if (response?.status !== 200) {
			const data = await response?.json();
			const responseData: IResponseData<null> = {
				message: data?.message || "Verify failed",
				code: data?.code || response?.status,
				data: null,
			};

			return new Response(JSON.stringify(responseData), {
				status: response?.status,
				statusText: response?.statusText,
				headers: _removeAuthCookies(headers),
			});
		}

		const cookies = response.headers.getSetCookie();

		const accessToken = cookies
			.find((cookie) => cookie.startsWith("accessToken="))
			?.split(";")[0]
			.split("=")[1];

		const accessTokenExpiresIn = cookies
			.find((cookie) => cookie.startsWith("accessToken="))
			?.split(";")
			.find((part) => part.trim().startsWith("Expires="))
			?.split("=")[1];

		const refreshToken = cookies
			.find((cookie) => cookie.startsWith("refreshToken="))
			?.split(";")[0]
			.split("=")[1];

		const refreshTokenExpiresIn = cookies
			.find((cookie) => cookie.startsWith("refreshToken="))
			?.split(";")
			.find((part) => part.trim().startsWith("Expires="))
			?.split("=")[1];

		if (existingAccessToken === accessToken) {
			// Access token is still valid, no need to update cookies
			return new Response(JSON.stringify(responseData), {
				status: response.status,
				statusText: response.statusText,
				headers,
			});
		}

		if (
			!accessToken ||
			!accessTokenExpiresIn ||
			!refreshToken ||
			!refreshTokenExpiresIn
		) {
			const responseData: IResponseData<null> = {
				message: "Invalid tokens received",
				code: 400,
				data: null,
			};

			return new Response(JSON.stringify(responseData), {
				status: responseData.code,
				statusText: responseData.message || "Invalid tokens received",
				headers: _removeAuthCookies(headers),
			});
		}

		const cookieOptions = getAuthCookieOptions();
		const domainAttr = cookieOptions.domain
			? `; Domain=${cookieOptions.domain}`
			: "";

		if (accessToken !== existingAccessToken) {
			headers.append(
				"Set-Cookie",
				`accessToken=${accessToken}; Path=/; HttpOnly; SameSite=${cookieOptions.sameSite}; Secure=${cookieOptions.secure}; Max-Age=${Math.floor(
					(new Date(accessTokenExpiresIn).getTime() - Date.now()) /
						1000,
				)}${domainAttr}`,
			);
		}

		if (refreshToken !== existingRefreshToken) {
			headers.append(
				"Set-Cookie",
				`refreshToken=${refreshToken}; Path=/; HttpOnly; SameSite=${cookieOptions.sameSite}; Secure=${cookieOptions.secure}; Max-Age=${Math.floor(
					(new Date(refreshTokenExpiresIn).getTime() - Date.now()) /
						1000,
				)}${domainAttr}`,
			);
		}

		return new Response(JSON.stringify(responseData), {
			status: response.status,
			statusText: response.statusText,
			headers,
		});
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Unknown error";
		const responseData: IResponseData<null> = {
			message: `Internal server error: ${message}`,
			code: 500,
			data: null,
		};
		return new Response(JSON.stringify(responseData), {
			status: responseData.code,
			statusText: responseData.message || "Internal Server Error",
			headers,
		});
	}
}
