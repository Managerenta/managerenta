import { createHash } from "node:crypto";
import { createReadStream, existsSync } from "node:fs";

/**
 * Computes the SHA-256 checksum of a file at the given path.
 *
 * @param path - The path to the file for which the checksum is to be computed.
 * @returns A promise that resolves to the SHA-256 checksum of the file as a hexadecimal string,
 *          or null if the file does not exist or an error occurs.
 */
export default async function fileChecksum(
	path: string,
): Promise<string | null> {
	try {
		if (!existsSync(path)) return null;
		return new Promise((resolve, reject) => {
			const hash = createHash("sha256");
			const input = createReadStream(path);

			input.on("error", reject);

			input.on("data", (chunk: Buffer | string) => {
				hash.update(chunk);
			});

			input.on("close", () => {
				resolve(hash.digest("hex"));
			});
		});
	} catch (_error) {
		return null;
	}
}
