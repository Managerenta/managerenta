"use server";
import type { Metadata } from "next";

const APP_HOSTNAME =
	(process?.env?.APP_HOSTNAME as unknown as URL) || ("" as unknown as URL);

interface IProps {
	title?: string;
	description?: string;
	image?: string;
	pathname?: string;
	keywords?: string[];
}

const defaultKeywords = [
	"project management",
	"task management",
	"team collaboration",
	"project tracking",
	"agile project management",
	"kanban board",
	"gantt chart",
	"time tracking",
	"resource management",
	"project planning",
];

async function getSeoMetadata({
	title,
	description,
	image,
	pathname,
	keywords,
}: IProps): Promise<Metadata> {
	const urlPath = !pathname ? APP_HOSTNAME : APP_HOSTNAME + pathname;

	const metadata: Metadata = {
		metadataBase: urlPath as URL,
		title: title?.substring(0, 65) || "Home",
		description: description?.substring(0, 100) || "Home page",
		icons: "/opengraph-image.png",
		openGraph: {
			type: "website",
			url: urlPath,
			siteName: "manageRenta",
			images: [
				{
					url: image || "/opengraph-image.png",
				},
			],
		},
		twitter: {
			card: "summary_large_image",
			images: [
				{
					url: image || "/opengraph-image.png",
					alt: "manageRenta - Project Management Tool",
				},
			],
		},
		authors: [{ name: "manageRenta Team", url: APP_HOSTNAME }],
		keywords: [...defaultKeywords, ...(keywords || [])],
		alternates: { canonical: urlPath },
	};

	return metadata;
}
export default getSeoMetadata;
