export default async function verifyUserLogin({
	cookieHeader = "",
}: {
	cookieHeader?: string;
} = {}): Promise<boolean> {
	try {
		const url = `/api/auth/verify`;

		const response = await fetch(url, {
			method: "POST",
			headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
		});

		if (response.status !== 200) {
			return false;
		}
		return true;
	} catch {
		return false;
	}
}
