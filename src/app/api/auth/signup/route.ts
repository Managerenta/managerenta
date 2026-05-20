import { defaultEnvOptions } from "@/constants";
import type { IResponseData } from "@/types";

export async function POST(req: Request) {
	try {
		const formData = await req.formData();

		const name = formData.get("name") as string;
		const username = formData.get("username") as string;
		const email = formData.get("email") as string;
		const password = formData.get("password") as string;

		if (!name || !username || !email || !password) {
			const responseData: IResponseData<null> = {
				message: "Missing required fields",
				code: 400,
				data: null,
			};

			return new Response(JSON.stringify(responseData), {
				status: 400,
				statusText: "Bad Request",
				headers: { "content-type": "application/json" },
			});
		}

		const payload = {
			name,
			username,
			email,
			password,
		};

		const { MAIN_SERVICE_URL } = defaultEnvOptions();
		const url = `${MAIN_SERVICE_URL}/api/auth/signup`;

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
				message: data?.message || "Signup failed",
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
		}> = await response.json();

		const { data } = json;

		const responseData: IResponseData<{ account: string }> = {
			data: {
				account: data?.account || "",
			},
			message: "Signup successful",
			code: response.status,
		};

		return new Response(JSON.stringify(responseData), {
			status: response.status,
			statusText: response.statusText,
			headers: { "content-type": "application/json" },
		});
	} catch (_error) {
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
