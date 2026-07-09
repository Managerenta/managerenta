import { compare } from "bcrypt";
import {
	ErrAccountRestricted,
	ErrInvalidCredentials,
	signTwoFactorTicket,
} from "../../constants";
import { getUserByEmailWithPasswordDB, loginUserDB } from "../../models";
import type { IJwtPayload } from "../../types";

export type LoginResult =
	| {
			twoFactorRequired: true;
			ticket: string;
			// Which second-factor methods this account can complete the challenge
			// with, so the UI renders the right step (a passkey-only account has
			// no authenticator code to type).
			methods: { totp: boolean; passkey: boolean };
	  }
	| { twoFactorRequired: false; session: IJwtPayload };

export default async function login({
	email,
	password,
	ip,
}: {
	email: string;
	password: string;
	ip?: string;
}): Promise<LoginResult | null> {
	const user = await getUserByEmailWithPasswordDB({ email });
	if (!user) throw ErrInvalidCredentials;

	const isPasswordValid = await compare(password, user.password);
	if (!isPasswordValid) throw ErrInvalidCredentials;

	// A suspended account is fully locked out. Check AFTER the password compare
	// so the response does not reveal whether the address maps to a real (but
	// suspended) account to someone who does not already know the password.
	if ((user as { status?: string }).status === "suspended") {
		throw ErrAccountRestricted;
	}

	// If the account has any second factor registered — TOTP 2FA or at least
	// one passkey — the password step alone is not sufficient. Issue a
	// short-lived challenge ticket; the caller must complete the second step
	// at /api/auth/login/2fa before any session cookie is set. NEVER short
	// circuit this — without this branch, 2FA is decorative (see
	// SECURITY_REVIEW.md S1). A registered passkey counts as an opt-in to a
	// second factor even when TOTP was never enabled.
	const hasTotp = !!user.security?.twoFactorEnabled;
	const hasPasskey = (user.security?.passkeys?.length ?? 0) > 0;
	if (hasTotp || hasPasskey) {
		const userId = user._id?.toString();
		if (!userId) throw ErrInvalidCredentials;
		return {
			twoFactorRequired: true,
			ticket: signTwoFactorTicket(userId),
			methods: { totp: hasTotp, passkey: hasPasskey },
		};
	}

	const session = await loginUserDB({ id: user._id, ip });
	if (!session) return null;
	return { twoFactorRequired: false, session };
}
