import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
	const env = process.env.NODE_ENV;

	const isProduction = env === "production";
	const sitemapURL = `${process.env.APP_HOSTNAME}/sitemaps/sitemap_index.xml`;

	return {
		rules: {
			userAgent: "*",
			allow: isProduction ? "/" : undefined,
			disallow: isProduction ? undefined : "/",
		},
		sitemap: isProduction ? sitemapURL : undefined,
	};
}
