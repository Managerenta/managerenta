"use client";

declare global {
	interface Navigator {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		msSaveBlob?: (blob: any, defaultName?: string) => boolean;
	}
}

function _download(
	filename: string,
	data: string | ArrayBuffer | ArrayBufferView | Blob,
	mime?: string,
	bom?: string | Uint8Array,
) {
	try {
		const blobData = typeof bom !== "undefined" ? [bom, data] : [data];
		const blob = new Blob(blobData as any, {
			type: mime || "application/octet-stream",
		});
		if (
			typeof (
				window.navigator as Navigator & {
					msSaveBlob?: (blob: any, defaultName?: string) => boolean;
				}
			).msSaveBlob !== "undefined"
		) {
			// IE workaround for "HTML7007: One or more blob URLs were
			// revoked by closing the blob for which they were created.
			// These URLs will no longer resolve as the data backing
			// the URL has been freed."
			(
				window.navigator as Navigator & {
					msSaveBlob?: (blob: any, defaultName?: string) => boolean;
				}
			).msSaveBlob?.(blob, filename);
		} else {
			const blobURL = window.URL?.createObjectURL
				? window.URL.createObjectURL(blob)
				: window.webkitURL.createObjectURL(blob);
			const tempLink = document.createElement("a");
			tempLink.style.display = "none";
			tempLink.href = blobURL;
			tempLink.setAttribute("download", filename);

			// Safari thinks _blank anchor are pop ups. We only want to set _blank
			// target if the browser does not support the HTML5 download attribute.
			// This allows you to download files in desktop safari if pop up blocking
			// is enabled.
			if (typeof tempLink.download === "undefined") {
				tempLink.setAttribute("target", "_blank");
			}

			document.body.appendChild(tempLink);
			tempLink.click();

			// Fixes "webkit blob resource error 1"
			setTimeout(() => {
				document.body.removeChild(tempLink);
				window.URL.revokeObjectURL(blobURL);
			}, 200);
		}
	} catch {
		// console.error("Download error:", error);
		return;
	}
}

export default function download(
	fileName: string,
	url: string,
	mimetype: string,
) {
	fileName = fileName.replaceAll(" ", "_").toLowerCase();
	try {
		fetch(url).then(async (res) => {
			const blob = await res.blob();

			_download(fileName, blob, mimetype);
		});
	} catch {
		return;
	}
}
