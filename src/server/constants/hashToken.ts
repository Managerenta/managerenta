import { createHash } from "node:crypto";

// One-way hash for unguessable single-use security tokens (password reset,
// email verification, org invites). The plaintext token is emailed to the
// user; the DB only holds the hash, so an attacker with read access to the
// `users` / `organizations` collection cannot consume a pending token.
//
// SECURITY — see SECURITY_REVIEW.md H6.
//
// We use unsalted SHA-256 because:
//   - The input is already 32 bytes of crypto.randomBytes — there is no
//     password-strength assumption to defend against.
//   - We need a deterministic value to look the record up by, so bcrypt
//     (which uses a random salt) won't work.
//   - SHA-256 is fast — token verification stays cheap.
export default function hashToken(token: string): string {
	return createHash("sha256").update(token, "utf8").digest("hex");
}
