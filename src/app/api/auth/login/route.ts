import { ErrInvalidAction, ErrInvalidFields } from "@/server/constants";
import {
	clearAuthCookies,
	created,
	getClientIp,
	handleError,
	setAuthCookies,
	withApiHandler,
} from "@/server/lib";
import { login } from "@/server/services";
import { loginBodySchema } from "@/server/validators/auth/validate";

export const runtime = "nodejs";

export const POST = withApiHandler(
	{
		route: "/api/auth/login",
		// Brute-force / credential-stuffing limit. The default 100/min is far
		// too permissive for an auth endpoint. See SECURITY_REVIEW.md H4.
		rateLimit: { windowMs: 15 * 60_000, maxRequests: 10 },
	},
	async ({ req }) => {
		try {
			let body: unknown;
			try {
				body = await req.json();
			} catch {
				throw ErrInvalidFields;
			}
			const parsed = loginBodySchema.safeParse(body);
			if (!parsed.success) throw ErrInvalidFields;

			const result = await login({
				email: parsed.data.email,
				password: parsed.data.password,
				ip: getClientIp(req),
			});
			if (!result) throw ErrInvalidAction;

			await setAuthCookies(result);
			return created(result, "Login successful");
		} catch (error) {
			await clearAuthCookies();
			return handleError(error);
		}
	},
);
