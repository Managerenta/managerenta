import { defaultEnvOptions, getAuthCookieOptions } from "@/constants";
import type { IResponseData } from "@/types";

export async function POST(req: Request) {
	try {
		const res = (await req.json()) as {
			email: string;
			password: string;
		};

		const payload = {
			email: res?.email,
			password: res?.password,
		};

		const { MAIN_SERVICE_URL } = defaultEnvOptions();

		const url = `${MAIN_SERVICE_URL}/api/auth/login`;

		const response = await fetch(url, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(payload),
		});

		if (response.status !== 201) {
			const data = await response.json();
			const headers = new Headers();
			headers.set("content-type", "application/json");

			const responseData: IResponseData<null> = {
				message: data?.message || "Login failed",
				code: data.code || response.status,
				data: null,
			};

			return new Response(JSON.stringify(responseData), {
				status: response.status,
				statusText: response.statusText,
				headers,
			});
		}

		const json: IResponseData<{
			account: string;
			accessToken: string;
			refreshToken: string;
			expiresIn: Date;
		}> = await response.json();

		const { data } = json;
		if (!data) return;
		// const { accessToken, refreshToken, expiresIn } = data;

		const headers = new Headers();

		const cookieOptions = getAuthCookieOptions();

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
			});
		}

		headers.set("content-type", "application/json");
		headers.append(
			"Set-Cookie",
			`accessToken=${accessToken}; Path=/; HttpOnly; SameSite=${cookieOptions.sameSite}; Secure=${cookieOptions.secure}; Max-Age=${Math.floor(
				(new Date(accessTokenExpiresIn).getTime() - Date.now()) / 1000,
			)}; Domain=${cookieOptions.domain};`,
		);
		headers.append(
			"Set-Cookie",
			`refreshToken=${refreshToken}; Path=/; HttpOnly; SameSite=${cookieOptions.sameSite}; Secure=${cookieOptions.secure}; Max-Age=${Math.floor(
				(new Date(refreshTokenExpiresIn).getTime() - Date.now()) / 1000,
			)}; Domain=${cookieOptions.domain};`,
		);

		const responseData: IResponseData<{ account: string }> = {
			data: {
				account: data.account,
			},
			message: "Login successful",
			code: response.status,
		};

		return new Response(JSON.stringify(responseData), {
			status: response.status,
			statusText: response.statusText,
			headers,
		});
	} catch (_error) {
		// return new Response("Internal server error", { status: 500 });
		const headers = new Headers();
		headers.set("content-type", "application/json");
		const responseData: IResponseData<null> = {
			message: "Internal server error",
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
