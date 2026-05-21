import "server-only";
import { ErrInvalidFileType, supportedImageMimeTypes } from "../constants";

export interface IFileUpload {
	fieldname: string;
	originalname: string;
	mimetype: string;
	buffer: Buffer;
	size: number;
}

export interface ParsedMultipart {
	fields: Record<string, string>;
	files: Record<string, IFileUpload[]>;
}

const DEFAULT_MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MiB / file
const DEFAULT_MAX_TOTAL_BYTES = 32 * 1024 * 1024; // 32 MiB / request
const DEFAULT_MAX_FILES = 8;

/**
 * Detect a file's real type from its first bytes. The browser-supplied
 * `File.type` is the user-agent's *suggestion* — we don't trust it for
 * security decisions (see SECURITY_REVIEW.md H2).
 *
 * Returns the canonical mime when recognised, else `null`.
 */
function sniffImageMime(buf: Buffer): string | null {
	if (buf.length < 12) return null;
	// PNG: 89 50 4E 47 0D 0A 1A 0A
	if (
		buf[0] === 0x89 &&
		buf[1] === 0x50 &&
		buf[2] === 0x4e &&
		buf[3] === 0x47 &&
		buf[4] === 0x0d &&
		buf[5] === 0x0a &&
		buf[6] === 0x1a &&
		buf[7] === 0x0a
	) {
		return "image/png";
	}
	// JPEG: FF D8 FF
	if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
		return "image/jpeg";
	}
	// WEBP: 'RIFF' .... 'WEBP'
	if (
		buf[0] === 0x52 &&
		buf[1] === 0x49 &&
		buf[2] === 0x46 &&
		buf[3] === 0x46 &&
		buf[8] === 0x57 &&
		buf[9] === 0x45 &&
		buf[10] === 0x42 &&
		buf[11] === 0x50
	) {
		return "image/webp";
	}
	return null;
}

/**
 * Parse a multipart/form-data Request into typed fields + file buffers.
 *
 * Hardening (see SECURITY_REVIEW.md):
 *  - per-file size cap (H2 / DoS)
 *  - per-request total size cap and file count cap (M5)
 *  - magic-byte sniffing — the client-supplied mimetype is ignored for the
 *    security decision (H2)
 *
 * @throws ErrInvalidFileType when a file's real type is outside
 *         `acceptedMimeTypes` or doesn't match any known image signature.
 */
export async function parseMultipart(
	req: Request,
	options?: {
		acceptedMimeTypes?: string[];
		maxFileSizeBytes?: number;
		maxTotalBytes?: number;
		maxFileCount?: number;
	},
): Promise<ParsedMultipart> {
	const acceptedMimeTypes =
		options?.acceptedMimeTypes ?? supportedImageMimeTypes;
	const maxBytes = options?.maxFileSizeBytes ?? DEFAULT_MAX_FILE_BYTES;
	const maxTotalBytes = options?.maxTotalBytes ?? DEFAULT_MAX_TOTAL_BYTES;
	const maxFileCount = options?.maxFileCount ?? DEFAULT_MAX_FILES;

	const form = await req.formData();
	const fields: Record<string, string> = {};
	const files: Record<string, IFileUpload[]> = {};

	let totalBytes = 0;
	let fileCount = 0;

	for (const [key, value] of form.entries()) {
		if (value instanceof File) {
			fileCount += 1;
			if (fileCount > maxFileCount) {
				throw new Error("Too many files");
			}
			if (value.size > maxBytes) {
				throw new Error("File too large");
			}
			totalBytes += value.size;
			if (totalBytes > maxTotalBytes) {
				throw new Error("Request payload too large");
			}
			const buffer = Buffer.from(await value.arrayBuffer());
			const sniffed = sniffImageMime(buffer);
			if (!sniffed || !acceptedMimeTypes.includes(sniffed)) {
				throw ErrInvalidFileType;
			}
			const file: IFileUpload = {
				fieldname: key,
				originalname: value.name,
				mimetype: sniffed,
				buffer,
				size: value.size,
			};
			if (!files[key]) files[key] = [];
			files[key].push(file);
		} else {
			fields[key] = value.toString();
		}
	}

	return { fields, files };
}

/** Convenience: read a single field from the parsed form */
export function singleFile(
	parsed: ParsedMultipart,
	fieldName: string,
): IFileUpload | undefined {
	return parsed.files[fieldName]?.[0];
}

export function singleFileBuffer(
	parsed: ParsedMultipart,
	fieldName: string,
): Buffer | undefined {
	return singleFile(parsed, fieldName)?.buffer;
}
