import { revokeAllUserSessionsDB, revokeUserSessionDB } from "../../models";

export async function revokeSession({
	userId,
	sessionId,
}: {
	userId: string;
	sessionId: string;
}): Promise<boolean> {
	return revokeUserSessionDB({ id: userId, sessionId });
}

/**
 * Revoke every session except (optionally) the caller's current one, so
 * "sign out of all other devices" leaves the current device signed in.
 */
export async function revokeAllSessions({
	userId,
	exceptRefreshToken,
}: {
	userId: string;
	exceptRefreshToken?: string | null;
}): Promise<boolean> {
	return revokeAllUserSessionsDB({
		id: userId,
		exceptRefreshToken: exceptRefreshToken ?? undefined,
	});
}
