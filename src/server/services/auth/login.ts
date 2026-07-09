import { compare } from "bcrypt";
import {
	ErrAccountRestricted,
	ErrInvalidCredentials,
	signTwoFactorTicket,
} from "../../constants";
import { getUserByEmailWithPasswordDB, loginUserDB } from "../../models";
import type { IJwtPayload } from "../../types";

export type LoginResult =
	| { twoFactorRequired: true; ticket: string }
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

	// If 2FA is enabled the password step alone is not sufficient. Issue a
	// short-lived challenge ticket; the caller must complete the second step
	// at /api/auth/login/2fa before any session cookie is set. NEVER short
	// circuit this — without this branch, 2FA is decorative (see
	// SECURITY_REVIEW.md S1).
	if (user.security?.twoFactorEnabled) {
		const userId = user._id?.toString();
		if (!userId) throw ErrInvalidCredentials;
		return {
			twoFactorRequired: true,
			ticket: signTwoFactorTicket(userId),
		};
	}

	const session = await loginUserDB({ id: user._id, ip });
	if (!session) return null;
	return { twoFactorRequired: false, session };
}
