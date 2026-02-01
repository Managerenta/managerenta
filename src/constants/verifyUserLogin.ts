import api from "./api";

export default async function verifyUserLogin({
	url,
	cookieHeader,
}: {
	url: string;
	cookieHeader?: string;
}): Promise<boolean> {
	try {
		const { status }: { status: number } = await api().get(url, {
			headers: {
				Cookie: cookieHeader ?? "",
			},
		});

		if (status !== 200) return false;

		return true;
	} catch {
		return false;
	}
}
