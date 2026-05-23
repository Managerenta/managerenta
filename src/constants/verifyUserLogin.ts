export default async function verifyUserLogin({
	cookieHeader = "",
}: {
	cookieHeader?: string;
} = {}): Promise<boolean> {
	try {
		const response = await fetch(`/api/auth/verify`, {
			method: "POST",
			headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
		});
		// `/api/auth/verify` always returns 200 — the answer is in the body.
		// Returning 400 for "not logged in" would make the browser log a
		// noisy resource-failure on every public page mount.
		if (response.status !== 200) return false;
		const body = (await response.json().catch(() => null)) as {
			data?: { authenticated?: boolean };
		} | null;
		return body?.data?.authenticated === true;
	} catch {
		return false;
	}
}
