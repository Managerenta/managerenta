// SVG is intentionally excluded — see SECURITY_REVIEW.md H1.
// SVG files can carry <script> / event handlers; serving them from the same
// origin (or a sibling cookie-bearing subdomain) makes them a stored-XSS vector.
const supportedImageMimeTypes: string[] = [
	"image/png",
	"image/jpg",
	"image/jpeg",
	"image/webp",
];

export default supportedImageMimeTypes;
