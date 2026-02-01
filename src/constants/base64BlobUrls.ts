"use client";

import convertBlobToBase64 from "./convertBlobToBase64";

export default async function base64BlobUrls(html: string) {
	// const patternImage = /<img[^>]*src="blob:([^\"]+)"/g;
	// const patternVideo = /<video[^>]*src="blob:([^\"]+)"/g;
	const patternImage = /<img[^>]*src="blob:([^"]+)"/g;
	const patternVideo = /<video[^>]*src="blob:([^"]+)"/g;

	let match: RegExpExecArray | null;

	const blobUrlPrefix = "blob";

	match = patternImage.exec(html);
	while (match !== null) {
		const blobUrl = match[1];

		const base64EncodedBlobUrl = await convertBlobToBase64(
			`${blobUrlPrefix}:${blobUrl}`,
		);
		html = html.replace(match[0], `<img src="${base64EncodedBlobUrl}"`);
		match = patternImage.exec(html);
	}

	match = patternVideo.exec(html);
	while (match !== null) {
		const blobUrl = match[1];

		const base64EncodedBlobUrl = await convertBlobToBase64(
			`${blobUrlPrefix}:${blobUrl}`,
		);
		html = html.replace(match[0], `<video src="${base64EncodedBlobUrl}"`);
		match = patternVideo.exec(html);
	}

	return html;
}
