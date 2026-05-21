import {
	Err2faCodeInvalid,
	Err2faTicketInvalid,
	ErrInvalidAction,
	ErrInvalidFields,
	verifyTwoFactorTicket,
} from "@/server/constants";
import { verifyTotpToken } from "@/server/constants/totp";
import {
	applyRateLimitHeaders,
	created,
	enforceRateLimit,
	fail,
	getClientIp,
	handleError,
	setAuthCookies,
	withApiHandler,
} from "@/server/lib";
import {
	getUserSecretsDB,
	loginUserDB,
	updateUserRawDB,
} from "@/server/models";
import { loginTwoFactorBodySchema } from "@/server/validators/auth/validate";

export const runtime = "nodejs";

// Tight window because the attacker already proved password knowledge to
// even reach this endpoint. 10 attempts per ticket is enough for legitimate
// typos and recovery-code retries; well below brute-force feasibility on a
// 6-digit TOTP within the 5-minute ticket lifetime.
const TWO_FACTOR_WINDOW_MS = 5 * 60_000;
const TWO_FACTOR_MAX_ATTEMPTS = 10;

export const POST = withApiHandler(
	{ route: "/api/auth/login/2fa", rateLimit: false },
	async ({ req }) => {
		try {
			let body: unknown;
			try {
				body = await req.json();
			} catch {
				throw ErrInvalidFields;
			}
			const parsed = loginTwoFactorBodySchema.safeParse(body);
			if (!parsed.success) throw ErrInvalidFields;

			const ticket = verifyTwoFactorTicket(parsed.data.ticket);
			if (!ticket) throw Err2faTicketInvalid;

			const ip = getClientIp(req);
			const rl = await enforceRateLimit(req, {
				windowMs: TWO_FACTOR_WINDOW_MS,
				maxRequests: TWO_FACTOR_MAX_ATTEMPTS,
				// Key on the userId carried in the ticket so an attacker
				// cannot fan attempts out across IPs.
				keyGenerator: () => `login-2fa:${ticket.userId}:${ip}`,
			});
			if (!rl.allowed) {
				return applyRateLimitHeaders(
					fail(429, "Too many attempts, please sign in again."),
					rl,
				);
			}

			const secrets = await getUserSecretsDB({ id: ticket.userId });
			if (!secrets?.totpSecret) throw Err2faTicketInvalid;

			let consumedRecoveryIndex = -1;
			let isValid = false;

			if (parsed.data.totpToken) {
				isValid = verifyTotpToken(
					secrets.totpSecret,
					parsed.data.totpToken,
				);
			}

			if (!isValid && parsed.data.recoveryCode) {
				const candidate = parsed.data.recoveryCode.trim().toLowerCase();
				const codes = secrets.recoveryCodes ?? [];
				consumedRecoveryIndex = codes.findIndex(
					(c) => c.toLowerCase() === candidate,
				);
				if (consumedRecoveryIndex >= 0) isValid = true;
			}

			if (!isValid) throw Err2faCodeInvalid;

			// Recovery codes are single-use — burn it before issuing the
			// session so a race cannot redeem the same code twice.
			if (consumedRecoveryIndex >= 0) {
				const remaining = [...(secrets.recoveryCodes ?? [])];
				remaining.splice(consumedRecoveryIndex, 1);
				await updateUserRawDB({
					id: ticket.userId,
					update: {
						$set: { "security.recoveryCodes": remaining },
					},
				});
			}

			const session = await loginUserDB({ id: ticket.userId, ip });
			if (!session) throw ErrInvalidAction;

			await setAuthCookies(session);
			return applyRateLimitHeaders(
				created(session, "Login successful"),
				rl,
			);
		} catch (error) {
			return handleError(error);
		}
	},
);
