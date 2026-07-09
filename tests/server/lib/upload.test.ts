import { describe, expect, it } from "vitest";
import { ErrInvalidFields, ErrInvalidFileType } from "@/server/constants";
import {
	parseMultipart,
	singleFile,
	singleFileBuffer,
} from "@/server/lib/upload";

// ---- hand-built file signatures -------------------------------------------

function pngBuffer(size = 24): Buffer {
	const buf = Buffer.alloc(Math.max(size, 12));
	Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(buf);
	return buf;
}

function jpegBuffer(size = 24): Buffer {
	const buf = Buffer.alloc(Math.max(size, 12));
	Buffer.from([0xff, 0xd8, 0xff, 0xe0]).copy(buf);
	return buf;
}

function webpBuffer(size = 24): Buffer {
	const buf = Buffer.alloc(Math.max(size, 12));
	buf.write("RIFF", 0, "ascii");
	buf.write("WEBP", 8, "ascii");
	return buf;
}

function fileOf(buf: Buffer, name: string, type: string): File {
	return new File([new Uint8Array(buf)], name, { type });
}

function multipartRequest(entries: Array<[string, string | File]>): Request {
	const fd = new FormData();
	for (const [key, value] of entries) fd.append(key, value);
	return new Request("http://localhost:3000/api/upload", {
		method: "POST",
		body: fd,
	});
}

function jsonRequest(body: string): Request {
	return new Request("http://localhost:3000/api/upload", {
		method: "PATCH",
		headers: { "content-type": "application/json" },
		body,
	});
}

// ---- tests -----------------------------------------------------------------

describe("parseMultipart — multipart bodies", () => {
	it("parses text fields and a real PNG file", async () => {
		const buf = pngBuffer(32);
		const req = multipartRequest([
			["title", "My house"],
			["photo", fileOf(buf, "house.png", "image/png")],
		]);

		const parsed = await parseMultipart(req);

		expect(parsed.fields).toEqual({ title: "My house" });
		expect(parsed.files.photo).toHaveLength(1);
		const file = parsed.files.photo?.[0];
		expect(file?.fieldname).toBe("photo");
		expect(file?.originalname).toBe("house.png");
		expect(file?.mimetype).toBe("image/png");
		expect(file?.size).toBe(32);
		expect(Buffer.compare(file?.buffer as Buffer, buf)).toBe(0);
	});

	it("accepts JPEG and WEBP magic bytes", async () => {
		const req = multipartRequest([
			["a", fileOf(jpegBuffer(), "a.jpg", "image/jpeg")],
			["b", fileOf(webpBuffer(), "b.webp", "image/webp")],
		]);
		const parsed = await parseMultipart(req);
		expect(parsed.files.a?.[0]?.mimetype).toBe("image/jpeg");
		expect(parsed.files.b?.[0]?.mimetype).toBe("image/webp");
	});

	it("trusts magic bytes over the client-declared content type", async () => {
		// Real PNG bytes, but the browser claims text/plain — must be accepted
		// and canonicalised to image/png (the declared type is untrusted).
		const req = multipartRequest([
			["photo", fileOf(pngBuffer(), "sneaky.txt", "text/plain")],
		]);
		const parsed = await parseMultipart(req);
		expect(parsed.files.photo?.[0]?.mimetype).toBe("image/png");
	});

	it("rejects a fake image: declared image/png but non-image bytes", async () => {
		const fake = Buffer.from("<script>alert(1)</script>", "utf8");
		const req = multipartRequest([
			["photo", fileOf(fake, "fake.png", "image/png")],
		]);
		await expect(parseMultipart(req)).rejects.toBe(ErrInvalidFileType);
	});

	it("rejects files too small to carry a signature (< 12 bytes)", async () => {
		const tiny = Buffer.from([0x89, 0x50, 0x4e, 0x47]); // PNG start but truncated
		const req = multipartRequest([
			["photo", fileOf(tiny, "tiny.png", "image/png")],
		]);
		await expect(parseMultipart(req)).rejects.toBe(ErrInvalidFileType);
	});

	it("rejects a real image whose sniffed type is outside acceptedMimeTypes", async () => {
		const req = multipartRequest([
			["photo", fileOf(pngBuffer(), "a.png", "image/png")],
		]);
		await expect(
			parseMultipart(req, { acceptedMimeTypes: ["image/jpeg"] }),
		).rejects.toBe(ErrInvalidFileType);
	});

	it("rejects a file over the per-file size cap", async () => {
		const req = multipartRequest([
			["photo", fileOf(pngBuffer(64), "big.png", "image/png")],
		]);
		await expect(
			parseMultipart(req, { maxFileSizeBytes: 32 }),
		).rejects.toThrow("File too large");
	});

	it("rejects when the file count cap is exceeded", async () => {
		const req = multipartRequest([
			["a", fileOf(pngBuffer(), "a.png", "image/png")],
			["b", fileOf(pngBuffer(), "b.png", "image/png")],
		]);
		await expect(parseMultipart(req, { maxFileCount: 1 })).rejects.toThrow(
			"Too many files",
		);
	});

	it("rejects when the total request payload cap is exceeded", async () => {
		const req = multipartRequest([
			["a", fileOf(pngBuffer(16), "a.png", "image/png")],
			["b", fileOf(pngBuffer(16), "b.png", "image/png")],
		]);
		await expect(
			parseMultipart(req, { maxTotalBytes: 20 }),
		).rejects.toThrow("Request payload too large");
	});

	it("groups repeated file fields under the same key", async () => {
		const req = multipartRequest([
			["photos", fileOf(pngBuffer(), "1.png", "image/png")],
			["photos", fileOf(jpegBuffer(), "2.jpg", "image/jpeg")],
		]);
		const parsed = await parseMultipart(req);
		expect(parsed.files.photos).toHaveLength(2);
		expect(parsed.files.photos?.map((f) => f.mimetype)).toEqual([
			"image/png",
			"image/jpeg",
		]);
	});

	it("throws ErrInvalidFields for a garbage content type", async () => {
		const req = new Request("http://localhost:3000/api/upload", {
			method: "POST",
			headers: { "content-type": "text/garbage" },
			body: "not a form at all",
		});
		await expect(parseMultipart(req)).rejects.toBe(ErrInvalidFields);
	});
});

describe("parseMultipart — JSON bodies", () => {
	it("flattens a JSON object into string fields and skips null/undefined", async () => {
		const req = jsonRequest(
			JSON.stringify({
				name: "Unit 4B",
				rent: 1200,
				meta: { beds: 2 },
				skipMe: null,
			}),
		);
		const parsed = await parseMultipart(req);
		expect(parsed.fields).toEqual({
			name: "Unit 4B",
			rent: "1200",
			meta: JSON.stringify({ beds: 2 }),
		});
		expect(parsed.files).toEqual({});
	});

	it("returns empty fields for a non-object JSON body", async () => {
		const parsed = await parseMultipart(jsonRequest("[1,2,3]"));
		expect(parsed.fields).toEqual({});
		expect(parsed.files).toEqual({});
	});

	it("throws ErrInvalidFields on malformed JSON", async () => {
		await expect(parseMultipart(jsonRequest("{nope"))).rejects.toBe(
			ErrInvalidFields,
		);
	});
});

describe("singleFile / singleFileBuffer", () => {
	it("returns the first file for a field, or undefined", async () => {
		const buf = pngBuffer();
		const parsed = await parseMultipart(
			multipartRequest([["photo", fileOf(buf, "p.png", "image/png")]]),
		);
		expect(singleFile(parsed, "photo")?.originalname).toBe("p.png");
		expect(singleFile(parsed, "missing")).toBeUndefined();
		expect(
			Buffer.compare(singleFileBuffer(parsed, "photo") as Buffer, buf),
		).toBe(0);
		expect(singleFileBuffer(parsed, "missing")).toBeUndefined();
	});
});
