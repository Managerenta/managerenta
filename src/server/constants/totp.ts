import crypto from "node:crypto";
import QRCode from "qrcode";

// RFC 4648 base32 alphabet (no padding for secrets)
const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function generateTotpSecret(byteLength = 20): string {
	const buf = crypto.randomBytes(byteLength);
	let bits = "";
	for (const byte of buf) bits += byte.toString(2).padStart(8, "0");
	let out = "";
	for (let i = 0; i + 5 <= bits.length; i += 5) {
		out += BASE32_ALPHABET[parseInt(bits.slice(i, i + 5), 2)];
	}
	return out;
}

function base32ToBuffer(secret: string): Buffer {
	const clean = secret.replace(/=+$/g, "").toUpperCase();
	let bits = "";
	for (const c of clean) {
		const i = BASE32_ALPHABET.indexOf(c);
		if (i < 0) continue;
		bits += i.toString(2).padStart(5, "0");
	}
	const bytes: number[] = [];
	for (let i = 0; i + 8 <= bits.length; i += 8) {
		bytes.push(parseInt(bits.slice(i, i + 8), 2));
	}
	return Buffer.from(bytes);
}

function hotp(secret: string, counter: number, digits = 6): string {
	const key = base32ToBuffer(secret);
	const buf = Buffer.alloc(8);
	buf.writeBigInt64BE(BigInt(counter));
	const hmac = crypto.createHmac("sha1", key).update(buf).digest();
	const offset = hmac[hmac.length - 1] & 0x0f;
	const binary =
		((hmac[offset] & 0x7f) << 24) |
		((hmac[offset + 1] & 0xff) << 16) |
		((hmac[offset + 2] & 0xff) << 8) |
		(hmac[offset + 3] & 0xff);
	const mod = 10 ** digits;
	return (binary % mod).toString().padStart(digits, "0");
}

const STEP_SECONDS = 30;

export function generateTotpToken(secret: string, now = Date.now()): string {
	const counter = Math.floor(now / 1000 / STEP_SECONDS);
	return hotp(secret, counter);
}

export function verifyTotpToken(
	secret: string,
	token: string,
	window = 1,
	now = Date.now(),
): boolean {
	const cleaned = token.replace(/\D/g, "");
	if (cleaned.length !== 6) return false;
	const counter = Math.floor(now / 1000 / STEP_SECONDS);
	for (let w = -window; w <= window; w++) {
		if (hotp(secret, counter + w) === cleaned) return true;
	}
	return false;
}

export function buildOtpAuthUrl({
	secret,
	account,
	issuer = "manageRenta",
}: {
	secret: string;
	account: string;
	issuer?: string;
}): string {
	const label = encodeURIComponent(`${issuer}:${account}`);
	const params = new URLSearchParams({
		secret,
		issuer,
		algorithm: "SHA1",
		digits: "6",
		period: String(STEP_SECONDS),
	});
	return `otpauth://totp/${label}?${params.toString()}`;
}

export async function generateOtpAuthQrCode(
	otpauthUrl: string,
): Promise<string> {
	return QRCode.toDataURL(otpauthUrl, {
		errorCorrectionLevel: "M",
		margin: 1,
		width: 240,
	});
}

export function generateRecoveryCodes(count = 8): string[] {
	const codes: string[] = [];
	for (let i = 0; i < count; i++) {
		const raw = crypto.randomBytes(5).toString("hex");
		codes.push(`${raw.slice(0, 5)}-${raw.slice(5)}`);
	}
	return codes;
}
