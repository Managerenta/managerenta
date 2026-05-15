import defaultEnvOptions from "./defaultEnvOptions";

export default function getAuthCookieOptions() {
	const { ENVIRONMENT } = defaultEnvOptions();
	const domain = process.env.COOKIE_DOMAIN || undefined;

	return {
		httpOnly: true,
		secure: ENVIRONMENT === "production",
		sameSite: "lax" as const,
		domain,
	};
}
