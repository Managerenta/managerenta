import defaultEnvOptions from "./defaultEnvOptions";

export default function getAuthCookieOptions() {
	const { ENVIRONMENT } = defaultEnvOptions();
	const cookie_domain = process.env.COOKIE_DOMAIN || "gkoi.com";

	return {
		httpOnly: true,
		secure: ENVIRONMENT === "production",
		sameSite: "lax" as const,
		domain: cookie_domain,
	};
}
