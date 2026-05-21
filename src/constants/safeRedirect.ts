// Sanitize the `?next=` query param from the proxy/login redirect.
//
// Rules:
//   - Must start with a single `/` and NOT `//` (which is protocol-relative
//     and an open-redirect vector).
//   - Must not be the literal `/login` (no loop).
//   - Anything else falls back to the supplied default.
//
// This is used client-side to decide where to send the user after a
// successful login. Open redirects look harmless but enable phishing
// (legitimate-looking link → attacker page) so we never trust raw input.
export default function safeRedirect(
	value: string | null | undefined,
	fallback = "/dashboard",
): string {
	if (!value) return fallback;
	if (!value.startsWith("/") || value.startsWith("//")) return fallback;
	if (value === "/login") return fallback;
	return value;
}
