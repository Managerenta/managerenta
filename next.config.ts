import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	/* config options here */
	allowedDevOrigins: ["192.168.18.10"],
	reactStrictMode: true,
	poweredByHeader: false,
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
				source: "/",
				headers: [
					{
						key: "cache-control",
						value: "no-cache",
					},
				],
			},
		];
	},
};

export default nextConfig;
