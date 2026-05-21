import type { NextConfig } from "next";

// Baseline security headers — see SECURITY_REVIEW.md M4 / H1.
// The CSP is intentionally conservative: server-rendered HTML only loads from
// self, images may be pulled from the configured CDN, styled-components emits
// inline <style> blocks (allowed), and we explicitly disallow framing.
const isProd = process.env.NODE_ENV === "production";

// `next dev` and React devtools use eval() for HMR / callstack reconstruction.
// React itself emits no eval() in production. So the strict no-unsafe-eval CSP
// only applies in production; dev gets a relaxed script-src.
const scriptSrc = isProd
	? "script-src 'self' 'unsafe-inline'"
	: "script-src 'self' 'unsafe-inline' 'unsafe-eval'";

const securityHeaders = [
	{
		key: "Strict-Transport-Security",
		value: "max-age=63072000; includeSubDomains; preload",
	},
	{ key: "X-Content-Type-Options", value: "nosniff" },
	{ key: "X-Frame-Options", value: "DENY" },
	{ key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
	{
		key: "Permissions-Policy",
		value: "camera=(), microphone=(), geolocation=()",
	},
	{
		key: "Content-Security-Policy",
		value: [
			"default-src 'self'",
			"base-uri 'self'",
			"form-action 'self'",
			"frame-ancestors 'none'",
			"img-src 'self' data: blob: https://cdn.managerenta.com https://*.s3.amazonaws.com https://*.s3.us-east-1.amazonaws.com",
			"font-src 'self' data:",
			// styled-components injects runtime <style> blocks; Next/React DOM
			// inline a small bootstrap script. 'unsafe-inline' on styles is
			// unavoidable for now; the script-src nonce path requires more
			// surgery and is left as follow-up.
			"style-src 'self' 'unsafe-inline'",
			scriptSrc,
			"connect-src 'self' https://cdn.managerenta.com https://*.s3.amazonaws.com https://*.s3.us-east-1.amazonaws.com",
			"object-src 'none'",
		].join("; "),
	},
];

const nextConfig: NextConfig = {
	/* config options here */
	output: "standalone",
	allowedDevOrigins: ["192.168.18.10"],
	reactStrictMode: true,
	poweredByHeader: false,
	productionBrowserSourceMaps: false,
	compiler: {
		styledComponents: true,
	},
	// Heavy native / server-only deps must not be bundled into the
	// route-handler bundles. They are loaded from node_modules at runtime.
	serverExternalPackages: [
		"@aws-sdk/client-s3",
		"@aws-sdk/s3-request-presigner",
		"bcrypt",
		"cron",
		"ioredis",
		"mongoose",
		"prom-client",
		"sharp",
	],
	async headers() {
		return [
			{
				source: "/:path*",
				headers: securityHeaders,
			},
			{
				source: "/",
				headers: [{ key: "cache-control", value: "no-cache" }],
			},
		];
	},
};

export default nextConfig;
