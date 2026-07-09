import { ErrInvalidAction, ErrInvalidFields } from "@/server/constants";
import {
	applyRateLimitHeaders,
	clearAuthCookies,
	created,
	enforceRateLimit,
	fail,
	getClientIp,
	handleError,
	ok,
	setAuthCookies,
	withApiHandler,
} from "@/server/lib";
import { login } from "@/server/services";
import { loginBodySchema } from "@/server/validators/auth/validate";

export const runtime = "nodejs";

// Brute-force / credential-stuffing window. The first key dimension is the
// IP; the second is the email so a credential-stuffing attacker who tries
// many emails from one IP does not collapse into a single bucket per IP.
// See SECURITY_REVIEW.md H4 / S3.
const LOGIN_WINDOW_MS = 15 * 60_000;
const LOGIN_MAX_ATTEMPTS = 10;

export const POST = withApiHandler(
	{ route: "/api/auth/login", rateLimit: false },
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

			const ip = getClientIp(req);
			const emailKey = parsed.data.email.trim().toLowerCase();
			const rl = await enforceRateLimit(req, {
				windowMs: LOGIN_WINDOW_MS,
				maxRequests: LOGIN_MAX_ATTEMPTS,
				keyGenerator: () => `login:${ip}:${emailKey}`,
			});
			if (!rl.allowed) {
				return applyRateLimitHeaders(
					fail(
						429,
						"Too many login attempts, please try again later.",
					),
					rl,
				);
			}

			const result = await login({
				email: parsed.data.email,
				password: parsed.data.password,
				ip,
			});
			if (!result) throw ErrInvalidAction;

			if (result.twoFactorRequired) {
				// Don't set any auth cookie yet — the password step alone does
				// not grant a session when a second factor is registered. Pass
				// the available methods so the client renders the right step.
				return applyRateLimitHeaders(
					ok(
						{
							twoFactorRequired: true,
							ticket: result.ticket,
							methods: result.methods,
						},
						"Two-factor authentication required",
					),
					rl,
				);
			}

			await setAuthCookies(result.session);
			return applyRateLimitHeaders(
				created(result.session, "Login successful"),
				rl,
			);
		} catch (error) {
			await clearAuthCookies();
			return handleError(error);
		}
	},
);
