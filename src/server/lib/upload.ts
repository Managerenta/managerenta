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

/**
 * Parse a multipart/form-data Request into typed fields + file buffers.
 * Mirrors the shape we previously got from multer's `.fields([...])` so
 * controller logic that used `req.files.<name>[0].buffer` ports cleanly.
 *
 * @throws ErrInvalidFileType when a file's mime is outside `acceptedMimeTypes`.
 */
export async function parseMultipart(
	req: Request,
	options?: {
		acceptedMimeTypes?: string[];
		maxFileSizeBytes?: number;
	},
): Promise<ParsedMultipart> {
	const acceptedMimeTypes =
		options?.acceptedMimeTypes ?? supportedImageMimeTypes;
	const maxBytes = options?.maxFileSizeBytes ?? 10 * 1024 * 1024;

	const form = await req.formData();
	const fields: Record<string, string> = {};
	const files: Record<string, IFileUpload[]> = {};

	for (const [key, value] of form.entries()) {
		if (value instanceof File) {
			if (!acceptedMimeTypes.includes(value.type)) {
				throw ErrInvalidFileType;
			}
			if (value.size > maxBytes) {
				throw new Error("File too large");
			}
			const buffer = Buffer.from(await value.arrayBuffer());
			const file: IFileUpload = {
				fieldname: key,
				originalname: value.name,
				mimetype: value.type,
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
