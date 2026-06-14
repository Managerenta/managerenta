import { getUserSessionsDB } from "../../models";

const REFRESH_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

export interface ISessionView {
	id: string;
	createdAt: Date;
	expiresAt: Date;
	current: boolean;
}

/**
 * List the user's active sessions. `currentRefreshToken` (the raw token from
 * the caller's own cookie) is used to flag which session is the current one.
 * The raw token is never returned to the client.
 */
export default async function getSessions({
	userId,
	currentRefreshToken,
}: {
	userId: string;
	currentRefreshToken?: string | null;
}): Promise<ISessionView[]> {
	const sessions = await getUserSessionsDB({ id: userId });
	return sessions
		.map((s) => ({
			id: s.sessionId,
			createdAt: new Date(s.deadline.getTime() - REFRESH_WINDOW_MS),
			expiresAt: s.deadline,
			current:
				!!currentRefreshToken && s.rawToken === currentRefreshToken,
		}))
		.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}
