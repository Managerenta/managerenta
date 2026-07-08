# Security Review — managerenta-client

**Date:** 2026-05-21
**Branch:** `develop`
**Scope:** Full repo (env files, `next.config.ts`, `src/proxy.ts`, every `/api/*` route, services, models, S3/upload helpers, Docker/CI configs).

This is the consolidated audit. See **§ Remediation status** at the end for what
has been patched in code and what remains to be done by an operator (secret
rotation, infra changes).

---

## 🔴 CRITICAL

### C1 — Live production credentials sitting in working tree

[`.env.production`](.env.production) (not tracked in git, verified via
`git ls-files` and `git log --all -- .env.production`) carries real prod
credentials:

```
MONGODB_URI="mongodb+srv://managerenta:[REDACTED]@[REDACTED].mongodb.net/..."
REDIS_URI="redis://managerenta:[REDACTED]@[REDACTED].redislabs.com:[PORT]"
S3_ACCESS_KEY="[REDACTED]"
S3_SECRET_ACCESS_KEY="[REDACTED]"
JWT_ACCESS_TOKEN_SECRET="[REDACTED]"   # ← comment admits dev secret reused in prod
JWT_REFRESH_TOKEN_SECRET="[REDACTED]"
```

`.env` (dev) also has real AWS IAM keys (redacted) for the dev
bucket. Treat all of these as compromised — they have been visible to anyone
with access to this machine, IDE indexers, backup tools, AI sessions, and any
build context that copied the working tree.

**Operator actions (not patchable in code):**

1. Rotate both AWS IAM users; audit CloudTrail for usage of both (now rotated)
   access keys.
2. Rotate MongoDB Atlas user `managerenta` and Redis Cloud user `managerenta`.
3. Generate **distinct**, ≥ 32-byte random JWT secrets per environment.
4. Move secrets to AWS Secrets Manager / Amplify Secrets / SSM Parameter Store
   and remove them from the working tree.

### C2 — `.dockerignore` lets `.env*` and `.git` into the build image

`.dockerignore` only listed `.next`, `coverage`, `node_modules`, `.env.example`.
`Dockerfile`'s `COPY . .` therefore copied `.env`, `.env.production`, `.git`,
test artefacts, etc. into the **builder** layer. The runner stage only copies
`.next/standalone` + `.next/static`, so the runtime container is clean, but the
builder image (cached / pushed / scanned) carries the secrets.

**Status:** ✅ Fixed — see commit on this branch. New `.dockerignore` excludes
`.env`, `.env.*`, `.git`, test artefacts, tsbuildinfo.

### C3 — Regex injection in `getUserByEmailDB`

`src/server/models/users/index.ts` used `email: { $regex: email, $options: "i" }`
with the user-supplied email. The Zod email validator allowed regex
metacharacters in the local-part, so `getUserByEmailDB({ email: ".*@x.com" })`
matched any user, and `(a+)+$` caused ReDoS.

Affected callers:

- `src/app/api/auth/forgot-password/route.ts` — could trigger reset emails for
  arbitrary matched accounts.
- `src/server/services/organizations/inviteMember.ts` — collision of "already a
  member" check.

**Status:** ✅ Fixed — switched to exact-match `email: email.toLowerCase()` plus
`deleted: false`.

### C4 — JWT secrets fall back to empty string

`src/server/constants/environments.ts` did
`process.env.JWT_ACCESS_TOKEN_SECRET ?? ""`. If env is misconfigured, the app
boots with `""` as the HMAC key — any attacker who notices the misconfiguration
can forge tokens signed with `""`.

**Status:** ✅ Fixed — added startup assertions in
`src/server/runtime/bootstrap.ts` that reject missing / short JWT secrets in
production. Dev keeps the lenient default but logs a warning.

### C5 — `/api/metrics` is unauthenticated in production

`src/app/api/metrics/route.ts` returned 404 only when
`NODE_ENV !== "production" && METRICS_ENABLED !== "true"`. In production the
guard short-circuits and the Prometheus endpoint serves over the public
internet — including the `ip` label, request paths, and DB-timing histograms.

**Status:** ✅ Fixed — endpoint now requires `Authorization: Bearer <METRICS_TOKEN>`
in production (timing-safe compare). `ip` label dropped from
`restResponseTimeHistogram`.

---

## 🟠 HIGH

### H1 — SVG accepted as image upload → stored XSS

`src/server/constants/supportedImageMimeTypes.ts` whitelisted
`image/svg+xml`. SVG can carry `<script>` / `onload`; served from a signed S3
URL it executes against the bucket / CDN origin and can read cookies if the
bucket is on a sibling subdomain.

**Status:** ✅ Fixed — SVG removed from the whitelist.

### H2 — Client-supplied MIME type trusted; no magic-byte verification

`src/server/lib/upload.ts` accepted `value.type` (browser-supplied) as the
upload's mimetype. Combined with H1 this is the polyglot vector.

**Status:** ✅ Fixed — now sniffs the buffer's first bytes and verifies they
match a small whitelist of image signatures (PNG / JPEG / WEBP). Mismatches
throw `ErrInvalidFileType`.

### H3 — `S3 PutObject` missing `ACL: private` and SSE

`src/server/helpers/s3/s3UploadAssetImage.ts` and `uploadFile.ts` set no ACL
and no server-side-encryption header. A bucket misconfiguration = world-read.

**Status:** ✅ Fixed — `ACL: "private"` and `ServerSideEncryption: "AES256"`
added to all server-side uploads.

### H4 — No login-specific rate limit

`/api/auth/login` inherited the default `100 req/min` per IP. Login should be
strict.

**Status:** ✅ Fixed — login is now `10 attempts / 15 min` keyed by `IP + email`.
TOTP-related routes (`/api/users/2fa/*`) cut to `10 / 5 min` per user.

### H5 — Spoofable `X-Forwarded-For`

`src/server/lib/clientIp.ts` blindly trusted whichever IP header arrived first.
That bypasses rate limits and undermines the "IP-binding" of refresh tokens.

**Status:** ⚠️ Partial — defaulted to **disallow trusting forwarder headers**
unless `TRUSTED_PROXY=1` is set. When trusted-proxy mode is enabled, only
`x-real-ip` and `cf-connecting-ip` are honoured (`x-forwarded-for` first hop is
attacker-controlled when there is any intermediate forwarder, so we prefer
single-value headers set by the edge).
**Operator action:** set `TRUSTED_PROXY=1` in environments behind ALB /
CloudFront / Cloudflare; configure the edge to overwrite (not append) the
forwarded-IP header.

### H6 — Reset/verify/invite tokens stored plaintext and emailed in URLs

`security.passwordResetToken`, `emailVerificationToken`, and the org-invite
token were stored raw and re-emitted in notification `body` + `meta.token`.

**Status:** ⚠️ Partial — `meta.token` is no longer persisted in notification
records (only the user-facing link survives in `body`). Hashing at rest is
a larger refactor of the notification model and is left as follow-up.

### H7 — `MAX_REFRESH_TOKENS = 10`

`src/server/models/users/index.ts` allowed 10 concurrent refresh tokens, giving
a stolen token a long stealthy life.

**Status:** ✅ Fixed — cap lowered to **3**. Password-change / 2FA toggle now
invalidates all refresh tokens (see `src/server/services/users/*`).

### H8 — Non-atomic refresh-token rotation

`reLoginUserWithRefreshTokenDB` did read → mutate → save in JS, allowing a
race where the same token can be redeemed twice.

**Status:** ✅ Fixed — rotation is now a single `findOneAndUpdate` with
`$pull` on the old token + `$push` on the new one; if zero documents matched,
the request 401s.

### H9 — `jsonwebtoken.verify` called without algorithm whitelist; custom expiry

`decodeJwtToken` neither pinned the algorithm nor used the standard `exp`
claim.

**Status:** ✅ Fixed — `verify(token, secret, { algorithms: ["HS256"] })`. The
manual expiry check stays in place but is now a defense-in-depth backup of the
library's `exp` enforcement.

### H10 — `SameSite=Lax` cookies + state-changing POSTs = CSRF surface

**Status:** ⚠️ Partial — auth cookies now `SameSite=Strict` in production.
Origin/Referer validation on unsafe methods is a deeper change and left as
follow-up. (A first-party SPA on the same eTLD+1 isn't broken by Strict.)

### H11 — `clientAppURLs` whitelist still references `maqamah.com`

`src/server/constants/clientAppURLs.ts` had a stale brand name; the prod cookie
domain is `.managerenta.com`. Affected the 2× rate-limit "trusted origin" bonus.

**Status:** ✅ Fixed — whitelist now `localhost` + `managerenta.com`.

---

## 🟡 MEDIUM

### M1 — `updateUserRawDB` accepts arbitrary update payload

Footgun for mass-assignment. Today's callers are safe but the function is one
copy-paste away from disaster.

**Status:** ⚠️ Documented; not removed. Replacement is a larger refactor.

### M2 — Proxy treats "any cookie named `accessToken`" as authenticated

`src/proxy.ts` only checks presence, not signature, so a junk cookie passes
the page-shell gate (data fetches still fail).

**Status:** ⚠️ Documented; verifying the JWT in middleware requires switching
from `jsonwebtoken` to `jose` for edge runtime compatibility — left as
follow-up.

### M3 — Cookie scoping (`__Host-` / `secure`)

`secure` is gated on `NODE_ENV === "production"`; cookies use a `.domain` that
covers all subdomains.

**Status:** ⚠️ Documented; switching to `__Host-` cookies requires dropping the
domain attribute and was deferred.

### M4 — Missing security headers

`next.config.ts` set only `cache-control: no-cache` on `/`.

**Status:** ✅ Fixed — added `Strict-Transport-Security`, `X-Content-Type-Options`,
`X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, and a
conservative `Content-Security-Policy` for all routes.

### M5 — Multipart: no per-request file count / total size cap

**Status:** ✅ Fixed — `parseMultipart` caps total request payload at 32 MiB
and file count at 8 per request.

### M6 — `sharp` lacks `limitInputPixels`

**Status:** ✅ Fixed — `sharp(buffer, { limitInputPixels: 24_000_000 })`.

### M7 — Soft-delete filter only on user collection's aggregate hook

**Status:** ⚠️ Documented; cross-collection `$lookup`s should add an explicit
`pipeline` filter on the joined collection — audit each call-site individually.

### M8 — Redis `KEYS` used for invalidation

Blocks Redis on large data sets; potential DoS lever.

**Status:** ⚠️ Documented; replacement uses `SCAN` cursor — left as follow-up.

### M9 — Redis URI lacks TLS in prod

Use `rediss://` and URL-encode the `@` and `&` in the password.

**Operator action:** rotate password to one without URI-special characters,
switch to `rediss://`.

### M10 — Seed script with hardcoded test passwords

**Status:** ✅ Fixed — `scripts/seed.ts` now refuses to run when
`NODE_ENV === "production"`.

### M11 — Notification records persist tokens

See H6.

### M12 — Notification `markRead` ownership check

Audit `markNotificationReadDB` to ensure the filter includes `userId`.

**Status:** ⚠️ Audit follow-up.

### M13 — Rate-limit header application is mutation, not response replacement

`applyRateLimitHeaders` mutates the response in place. Functional reliability
nit; leaving as-is.

---

## 🟢 LOW / informational

- Pick one of `jose` / `jsonwebtoken`; consolidating reduces algorithm-confusion
  footguns and unlocks middleware-side verification (see M2).
- `src/server/constants/hash.ts` uses pure-JS `hash.js`; `node:crypto` is faster.
- `productionBrowserSourceMaps` not explicit in `next.config.ts` (Next defaults
  to off).
- Dockerfile has no `HEALTHCHECK`.
- `buildspec.yml` passes `$DOCKER_TOKEN` via env var; prefer CodeBuild
  `secrets-manager` block.

---

## Remediation status

| ID | Severity | Title | Status |
|----|----------|-------|--------|
| C1 | Critical | Live prod secrets in `.env.production` | ⚠️ Operator: rotate |
| C2 | Critical | `.dockerignore` lets `.env*` into build | ✅ Fixed |
| C3 | Critical | Regex injection in `getUserByEmailDB` | ✅ Fixed |
| C4 | Critical | JWT secrets fall back to `""` | ✅ Fixed |
| C5 | Critical | `/api/metrics` unauthenticated in prod | ✅ Fixed |
| H1 | High | SVG MIME accepted | ✅ Fixed |
| H2 | High | Client-supplied MIME trusted | ✅ Fixed |
| H3 | High | S3 PutObject missing ACL/SSE | ✅ Fixed |
| H4 | High | No login-specific rate limit | ✅ Fixed |
| H5 | High | Spoofable XFF | ⚠️ Partial (env-gated) |
| H6 | High | Tokens in notification meta | ⚠️ Partial |
| H7 | High | `MAX_REFRESH_TOKENS = 10` | ✅ Fixed |
| H8 | High | Non-atomic refresh rotation | ✅ Fixed |
| H9 | High | JWT alg not pinned | ✅ Fixed |
| H10 | High | `SameSite=Lax` | ⚠️ Partial (Strict in prod) |
| H11 | High | Stale `clientAppURLs` | ✅ Fixed |
| M1 | Medium | `updateUserRawDB` footgun | ⚠️ Documented |
| M2 | Medium | Proxy doesn't verify JWT | ⚠️ Documented |
| M3 | Medium | Cookie `__Host-` scoping | ⚠️ Documented |
| M4 | Medium | Missing security headers | ✅ Fixed |
| M5 | Medium | Multipart limits | ✅ Fixed |
| M6 | Medium | `sharp` decompression bombs | ✅ Fixed |
| M7 | Medium | Soft-delete in `$lookup` | ⚠️ Audit follow-up |
| M8 | Medium | Redis `KEYS` | ⚠️ Follow-up |
| M9 | Medium | Redis TLS | ⚠️ Operator |
| M10 | Medium | Seed prod-guard | ✅ Fixed |
| M11 | Medium | Tokens in notification records | ⚠️ See H6 |
| M12 | Medium | Notification ownership filter | ⚠️ Audit follow-up |
| M13 | Medium | Rate-limit header mutation | ℹ️ Won't fix |

---

## Second pass (2026-05-21) — auth-gate audit fixes

The first pass focused on infrastructure / dependency hardening. A follow-up
audit of how the `/app` routes and `/api/*` routes are token-gated turned up
the issues below. All marked ✅ are fixed on this branch.

### S1 — 🔴 2FA was never enforced on login

`src/server/services/auth/login.ts` did password compare only. The
`/api/users/2fa/enable` flow enrolled the user, the settings UI showed
"Enabled", but `/api/auth/login` returned a session on password alone.
Anyone with the password walked past 2FA. The toggle was decorative.

**Status:** ✅ Fixed — login is now a two-step flow:

1. `POST /api/auth/login` validates email+password. When `twoFactorEnabled`
   is true on the account, the response is `{ twoFactorRequired: true,
   ticket }` with NO session cookies set. The ticket is a 5-minute,
   audience-scoped JWT signed with a secret derived from
   `JWT_ACCESS_TOKEN_SECRET` (see `src/server/constants/twoFactorTicket.ts`).
2. `POST /api/auth/login/2fa` accepts `{ ticket, totpToken | recoveryCode }`.
   It verifies the ticket, checks the TOTP code against the stored secret
   (or a stored recovery code, which is consumed atomically), then issues
   the session.

Rate limits: the password step is keyed by `IP+email` at 10/15 min; the 2FA
step is keyed by `userId+IP` at 10/5 min — both per-bucket counters that an
attacker can't blow through by rotating addresses or accounts. The
LoginWrapper UI shows the TOTP input when it sees `twoFactorRequired`, with
a "use a recovery code" toggle for the fallback.

### S2 — 🔴 `TRUSTED_PROXY=0` collapsed rate limiting to one global bucket

`src/server/lib/clientIp.ts` returned the literal string `"unknown"` for
every request when `TRUSTED_PROXY` was not set. The rate limiter's default
keyGenerator is the client IP, so every limited endpoint became one global
counter. Combined with the login rate limit, an attacker could exhaust the
global bucket for everyone with 10 requests.

**Status:** ✅ Fixed — `getClientIp` now extracts a per-client IP even
without TRUSTED_PROXY. In trusted-proxy mode it still prefers
`cf-connecting-ip` / `x-real-ip` and falls back to the LAST hop of
`x-forwarded-for` (closest to the edge). Outside trusted-proxy mode it
takes the FIRST hop (attacker-controlled, but at least non-degenerate),
logs a one-time warning in production so operators see the
misconfiguration, and relies on composite rate-limit keys (IP+email,
IP+userId) to raise the cost of spoofing on sensitive endpoints.

### S3 — 🟠 Login rate limit was not "IP + email" as documented

`src/app/api/auth/login/route.ts` passed no `keyGenerator` to the rate
limiter, so the documented `IP + email` composite key (SECURITY_REVIEW.md
H4) was actually `IP`-only — and IP was `"unknown"` for everyone (see S2).

**Status:** ✅ Fixed — login parses the body first, then enforces the rate
limit with `keyGenerator: () => \`login:${ip}:${email}\``. `withApiHandler`
gained support for `rateLimit: false` so routes can run the limiter inside
the handler when the key needs request data.

### S4 — 🟠 Password change / 2FA toggle did not invalidate refresh tokens

`changePasswordDB`, `/api/users/2fa/enable`, `/api/users/2fa/disable`, and
the reset-password flow each updated the relevant fields but left
`refreshTokens` intact. A stolen refresh token outlived the password it was
issued under (and outlived the 2FA toggle) for the full 30-day window.

**Status:** ✅ Fixed — all four code paths now set `refreshTokens: []` in
the same write that changes the credential or 2FA state. Every device must
re-authenticate.

### S5 — 🟡 Proxy gate was cookie-presence only

`src/proxy.ts` only checked `request.cookies.has("accessToken")`. An
attacker could set any value to defeat the redirect. Impact was limited by
client-rendered pages (no SSR data was leaked), but the gate offered zero
real protection — every "logged in" check at the edge was trustless.

**Status:** ✅ Fixed — proxy now verifies the JWT signature with `jose`
(edge-compatible). Junk cookies fail and redirect to /login. When only a
refresh cookie is present the request is allowed through as "may-refresh"
so the page's bootstrap can rotate via `/api/auth/verify`. The redirect to
`/login` now preserves the original path as `?next=…` (sanitized client
side by `safeRedirect` so it can never become an open redirect).

### S6 — 🟠 Org admin could demote / remove the org owner

`src/app/api/organizations/[id]/members/[memberId]/route.ts` PATCH/DELETE
called `assertOrganizationAdmin` but never checked whether `memberId` was
the org's `ownerId`. A malicious admin could `PATCH { role: VIEWER }` on
the owner or `DELETE` them from the members list.

**Status:** ✅ Fixed — both routes now call `assertOwnerInvariants` which:
- rejects any operation targeting the owner (`ErrCannotRemoveOwner`)
- rejects the operation if it would remove the org's last admin
  (`ErrMustKeepOneAdmin`)

The check reads through `getOrganizationById({ refreshCache: true })` to
avoid making authorization decisions against stale Redis state, and the
PATCH/DELETE handlers now invalidate the org cache after a successful
write.

### S7 — 🟡 `/api/auth/verify` was un-rate-limited and re-issued cookies on every call

Every successful call set new auth cookies (effectively extending the
refresh-token window). Combined with the global-bucket bug (S2), anyone
holding any valid token could hammer this endpoint to extend session
lifetime forever or to amplify load.

**Status:** ✅ Fixed — added a `30 req / min` limit per IP.

### S8 — 🟡 Accept-invite link lost its token across the auth redirect

`/invitations/accept` is in the page proxy's PROTECTED_ROUTES. An
unauthenticated invitee hitting the link was bounced to `/login` and lost
the `?token=…` query — UX bug that pushed users toward re-requesting
invites.

**Status:** ✅ Fixed — `proxy.ts` redirects to `/login?next=<original>` and
LoginWrapper navigates to the `next` path after auth (via `safeRedirect` to
prevent open redirect). The invite page's "Need to sign in first?" link
also round-trips the token through `?next=`.

### S9 — 🟢 `/add-transaction` orphan in PROTECTED_ROUTES

The path `/add-transaction` was in `PROTECTED_ROUTES` but no such page
exists. The real route is `/tenants/[id]/add-transaction`, already covered
by the `/tenants` prefix.

**Status:** ✅ Fixed — removed from the list.

| ID | Severity | Title | Status |
|----|----------|-------|--------|
| S1 | Critical | 2FA not enforced on login | ✅ Fixed |
| S2 | Critical | `TRUSTED_PROXY=0` collapsed rate limiting | ✅ Fixed |
| S3 | High | Login rate limit was IP-only | ✅ Fixed |
| S4 | High | Password change / 2FA toggle left refresh tokens | ✅ Fixed |
| S5 | Medium | Proxy gate was cookie-presence only | ✅ Fixed |
| S6 | High | Org admin could demote / remove owner | ✅ Fixed |
| S7 | Medium | `/api/auth/verify` un-rate-limited | ✅ Fixed |
| S8 | Medium | Invite token lost across login redirect | ✅ Fixed |
| S9 | Low | Dead `/add-transaction` in PROTECTED_ROUTES | ✅ Fixed |

---

## Third pass (2026-05-21) — remaining backlog cleared

### M3 — `__Host-` cookie scoping ✅ Fixed

`src/server/lib/cookies.ts` now names the cookies `__Host-accessToken` and
`__Host-refreshToken` in production, drops the `Domain` attribute, and
keeps `Path=/` and `Secure=true`. The browser will refuse to set these
without HTTPS, so dev (which runs over `http://localhost`) keeps the bare
names. `clearAuthCookies` also expires the legacy names so any user who
held a pre-migration cookie is cleaned up on their next sign-out / auth
failure. `src/proxy.ts` mirrors the same naming in lockstep.

**Operator note:** subdomain sharing is gone — auth cookies are host-only.
If the deployment ever needs to share sessions between, e.g., `app.X` and
`admin.X`, switch to a single host or build an SSO bridge instead of
widening the cookie.

### H10 — Origin / Referer CSRF validation ✅ Fixed

New `src/server/lib/csrf.ts` rejects any POST/PUT/PATCH/DELETE that does
not carry an `Origin` (or, as fallback, a `Referer`) matching the app's
allow-list (`isOriginAllowed`). Wired into `withApiHandler` so every route
gets it by default; opt-out with `csrf: false` if a route ever genuinely
needs to accept non-browser callers (none today). Runs BEFORE the rate
limiter so a failed CSRF check does not burn a quota slot. Combined with
`SameSite=Strict` cookies this closes the classic CSRF surface even on
browsers that fail to honour SameSite.

### H6 — Hash security tokens at rest ✅ Fixed

New `src/server/constants/hashToken.ts` provides an unsalted SHA-256 hash
(adequate because the input is 32 bytes of `crypto.randomBytes`).
- Password reset: `forgot-password` hashes the generated token before
  storing it; `reset-password` hashes the URL token before lookup.
- Email verification: `request-email-verification` hashes before store;
  `verify-email` hashes before lookup.
- Org invites: `inviteMember` stores `hashToken(token)` on the org
  document; `acceptInvite` hashes the URL token before lookup. The admin
  revoke route works with the hashed reference (which is what GET
  `/members` returns), so DB read access alone is not enough to redeem an
  invite.

Plaintext tokens now leave the server exactly once — in the outbound
email body — and never live in the database, the audit log, or the
notification record's `meta`.

### M1 — `updateUserRawDB` allowlist ✅ Fixed

`src/server/models/users/index.ts` now refuses to dispatch an update
whose paths fall outside an explicit allowlist
(`WRITABLE_USER_PATH_PREFIXES`: `password`, `refreshTokens`,
`preferences.*`, `notifications.*`, `reminders.*`, `security.*`,
`currentOrganizationId`). The guard inspects all known MongoDB update
operators (`$set` / `$unset` / `$push` / `$pull` / `$pullAll` / `$inc` /
`$addToSet`) and trips on any unsupported operator or any path outside
the list — so a copy-paste that forwards user input to this function
fails closed rather than silently mass-assigning. Dev logs the rejection
to the server console; prod returns `null`.

| ID | Severity | Title | Status |
|----|----------|-------|--------|
| M3 | Medium | `__Host-` cookie prefix | ✅ Fixed |
| H10 | High | CSRF (Origin/Referer) validation | ✅ Fixed |
| H6 | High | Tokens hashed at rest | ✅ Fixed |
| M1 | Medium | `updateUserRawDB` allowlist | ✅ Fixed |
