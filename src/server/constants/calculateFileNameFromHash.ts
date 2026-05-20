import { unlinkSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { v4 as uuid } from "uuid";
import { createTempDir, fileChecksum } from ".";

/**
 * Calculates the file name from the given file buffer.
 * If successful, returns the checksum of the file.
 * If an error occurs, returns a unique identifier.
 *
 * @param file The file buffer to calculate the file name from.
 * @returns A Promise that resolves to the calculated file name or a unique identifier.
 */
export default async function calculateFileNameFromHash(
	file: Buffer,
): Promise<string> {
	const id = uuid();
	try {
		// calculate file checksum
		const directory = createTempDir(resolve(__dirname, "../"));
		const filePath = resolve(directory, id);

		writeFileSync(filePath, new Uint8Array(file));
		const checksum = (await fileChecksum(filePath)) || "";
		unlinkSync(filePath);

		return checksum;
	} catch (_error) {
		return id;
	}
}
