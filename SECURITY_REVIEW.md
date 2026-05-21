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
MONGODB_URI="mongodb+srv://managerenta:KPZHBRHI9m5T4U6B@managerenta.un1xcfy.mongodb.net/..."
REDIS_URI="redis://managerenta:quEaY906p4yVkh9y@EA&@...redislabs.com:18329"
S3_ACCESS_KEY="AKIA3Q5DVFEJ4I3GC3GE"
S3_SECRET_ACCESS_KEY="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"
JWT_ACCESS_TOKEN_SECRET="Unaired8-Squeezing5-..."   # ← comment admits dev secret reused in prod
JWT_REFRESH_TOKEN_SECRET="Gallery3-Profile3-..."
```

`.env` (dev) also has real AWS IAM keys (`AKIA3Q5DVFEJ27Q2MBNV`) for the dev
bucket. Treat all of these as compromised — they have been visible to anyone
with access to this machine, IDE indexers, backup tools, AI sessions, and any
build context that copied the working tree.

**Operator actions (not patchable in code):**

1. Rotate both AWS IAM users; audit CloudTrail for `AKIA3Q5DVFEJ4I3GC3GE` and
   `AKIA3Q5DVFEJ27Q2MBNV` usage.
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
