"use client";

import api from "./api";

export default async function convertBlobToBase64(blobUrl: string) {
	if (!blobUrl.startsWith("blob:")) return blobUrl;

	const { data: blobData } = await api().get(blobUrl, {
		responseType: "blob",
	});

	const blob = new Blob([blobData], { type: "application/octet-stream" });
	const result = new Promise((resolve) => {
		const reader = new FileReader();
		reader.onloadend = () => resolve(reader.result);
		reader.readAsDataURL(blob);
	});

	return result;
}
