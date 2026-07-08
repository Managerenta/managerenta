import { describe, expect, it } from "vitest";
import supportedImageMimeTypes from "@/server/constants/supportedImageMimeTypes";

describe("supportedImageMimeTypes", () => {
	it("allows the raster formats the app supports", () => {
		expect(supportedImageMimeTypes).toEqual([
			"image/png",
			"image/jpg",
			"image/jpeg",
			"image/webp",
		]);
	});

	it("excludes SVG (stored-XSS vector, see SECURITY_REVIEW.md H1)", () => {
		expect(supportedImageMimeTypes).not.toContain("image/svg+xml");
	});

	it("excludes gif and non-image types", () => {
		expect(supportedImageMimeTypes).not.toContain("image/gif");
		expect(supportedImageMimeTypes).not.toContain("application/pdf");
		expect(supportedImageMimeTypes).not.toContain("text/html");
	});
});
