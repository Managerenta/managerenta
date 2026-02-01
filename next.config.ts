import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	/* config options here */
	output: "standalone",
	reactStrictMode: true,
	poweredByHeader: false,
	compiler: {
		styledComponents: true,
	},
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
