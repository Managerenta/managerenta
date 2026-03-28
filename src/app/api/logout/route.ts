import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST() {
	const cookieStore = await cookies();
	const cookieHeader = cookieStore.toString();

	try {
		await fetch(`${process.env.NEXT_PUBLIC_MAIN_SERVICE_URL}/api/auth/logout`, {
			method: "POST",
			headers: { Cookie: cookieHeader },
		});
	} catch {
		// still clear local cookies even if backend call fails
	}

	const response = NextResponse.json({ code: 200 });

	for (const cookie of cookieStore.getAll()) {
		response.cookies.delete(cookie.name);
	}

	return response;
}