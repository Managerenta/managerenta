import clientAppURLs from "./clientAppURLs";
import { NODE_ENV } from "./environments";

const whitelist = clientAppURLs.map((item) => item.url);

// Helper function to check if origin matches whitelist
export default function isOriginAllowed(origin: string | undefined): boolean {
	if (!origin) return false;

	// Allow local network IPs in development only (for mobile testing)
	if (NODE_ENV !== "production") {
		const rawHost = origin.replace(/^https?:\/\//, "").replace(/:\d+$/, "");
		if (/^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(rawHost))
			return true;
	}

	// Strip subdomain, port number, and protocol (https:// or http://), including www.
	const originWithoutPort = origin
		.replace(/:\d+$/, "") // remove port
		.replace(/^https?:\/\/(www\.)?/, "") // remove protocol and www
		.split(".")
		.slice(-2)
		.join("."); // keep only root domain (e.g., example.com)

	// Use exact match instead of regex to prevent bypass
	return whitelist.some((allowed) => originWithoutPort === allowed);
}
