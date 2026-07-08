# IAM Core Engine + Platform Super-Admin Tier — Design

**Date:** 2026-07-08
**Status:** Approved (brainstorming), pending implementation plan
**Scope:** Sub-project #1 of the platform administration effort — the IAM
foundation. The admin console UI, per-tenant self-service policy-editing UX,
and platform customization/settings screens are **separate sub-projects** with
their own specs.

---

## 1. Purpose & context

managerenta today authorizes requests with an ad-hoc, role-based scheme:
`withAuth` resolves an `AuthResult { userId, effectiveOwnerId, organizationId,
role }` where `role` is one of `admin | manager | viewer | null`, and individual
routes call helpers like `assertOrganizationAdmin`,
`assertOrganizationAdminOrManager`, `assertWriteRole`, or inline
`auth.role !== ADMIN` checks. There is **no platform/global administrator
concept** — the highest privilege that exists is org owner (implicit admin of
their own organization).

This design replaces that RBAC scheme, in full, with a single AWS-IAM-style
policy engine that serves **two planes**:

- **Platform plane** — a super-admin / staff tier that can manage and customize
  the platform across all tenants.
- **Org plane** — per-tenant authorization for organization members, replacing
  the `admin/manager/viewer` roles.

### Locked design decisions (from brainstorming)

1. **Both planes**, unified as one IAM system (not RBAC).
2. **AWS-style policy documents**: `{ Effect: Allow|Deny, Action, Resource,
   Condition }`, explicit-deny-wins, default-deny.
3. **Replace everything up front** — remove `admin/manager/viewer` everywhere.
   A phased rollout (engine → shadow → migrate reads → migrate writes → cut
   over) lives inside the implementation plan.
4. **No impersonation** — operators never become tenant users.
5. **Managed policies only, attached to groups.** Identities gain access solely
   via group membership. No inline policies, no direct-to-identity attachment.

### Non-goals (this spec)

- Admin console UI / policy-editor UX.
- Platform customization & settings screens.
- Tag-based resource grouping (deferred; can layer on via conditions later).

---

## 2. Domain model & collections

A new module, `src/server/iam/`, introduces these Mongoose collections. Every
concept is an AWS-shaped noun. **Identities carry no permissions**: a user or
operator gains access purely by group membership; groups gain access purely from
attached managed policies.

### `IamPolicy` — a managed policy document

```ts
{
  _id, name,                 // e.g. "OrgAdmin", "PlatformBilling"
  plane: "platform" | "org",
  orgId: ObjectId | null,    // null for platform plane & system-managed policies
  managedBy: "system" | "customer",
  document: {
    version: "2026-01-01",
    statements: [{
      sid?: string,
      effect: "Allow" | "Deny",
      action: string[],       // e.g. ["properties:Read","properties:Update"]
      resource: string[],     // ARN patterns, wildcards allowed
      condition?: { [operator: string]: { [key: string]: string[] } }
    }]
  },
  createdAt, updatedAt
}
```

### `IamGroup` — policies attach here, identities join here

```ts
{ _id, name, plane, orgId | null, managedBy, attachedPolicyIds: ObjectId[], createdAt, updatedAt }
```

### `IamGroupMembership` — the ONLY route to access

```ts
{ _id, groupId, principalType: "user" | "operator", principalId, orgId | null, createdAt }
```

### `IamOperator` — a platform-plane identity (staff / super-admin)

Kept separate from tenant `users` so platform access can never leak from an
ordinary signup.

```ts
{ _id, userId, status: "active" | "disabled", createdAt }
// userId links to an existing users doc for login / MFA
```

**System vs. customer objects:** `managedBy:"system"` policies and groups are
seeded and immutable from the API. Customers create their own
`managedBy:"customer"` policies and groups within their org plane.

---

## 3. ARN & action taxonomy

Both the resource-naming scheme and the verb vocabulary are **closed sets
defined in code**, so a typo cannot silently widen access.

### Resource ARNs

A 6-field colon format:

```
mr:{plane}:{service}:{orgId|*}:{type}/{id|*}
```

- `mr` — constant namespace (managerenta).
- `plane` — `platform` | `org`.
- `service` — `properties`, `units`, `tenants`, `documents`, `maintenance`,
  `vendors`, `analytics`, `calendar`, `audit`, `notifications`, `organizations`,
  `users`, `billing`, `iam`, `settings`.
- `orgId` — the owning org's id, or `*` in policy patterns.
- `type/id` — e.g. `property/652f…`, or `property/*`.

Examples:

- Specific property: `mr:org:properties:652abc:property/908def`
- Every tenant in one org: `mr:org:tenants:652abc:tenant/*`
- All platform settings: `mr:platform:settings:*:config/*`

### Actions

`{service}:{Verb}`, drawn from a fixed enum. Standard CRUD verbs (`Read`,
`List`, `Create`, `Update`, `Delete`) plus service-specific verbs where a route
is not plain CRUD:

- `tenants:SendReminder`, `tenants:GeneratePortalLink`
- `organizations:InviteMember`, `organizations:RemoveMember`,
  `organizations:Switch`
- `iam:AttachPolicy`, `iam:CreateGroup`, `iam:PutPolicy`
- Platform-only verbs: `organizations:Suspend`, `settings:Update`, etc.

Wildcards match per segment: `properties:*` = all property actions; `*` = all
actions (used only inside the seeded PlatformAdmin / OrgAdmin policies).

### Route mapping

Each API handler declares the single `(action, resourceArn)` it requires. A
central `arn()` builder and an `Action` union make these type-checked, not
stringly-typed. The ARN is built from `auth.effectiveOwnerId` /
`auth.organizationId` + the target id from the request.

**Defaulted sub-decisions:** action list is explicit per service (not a generic
`resource:verb` free-for-all); no tag-based resource grouping in v1.

---

## 4. The evaluation engine

A **pure function** — no I/O, no clock read — so it is exhaustively
unit-testable.

```ts
function evaluate(input: {
  principalArn: string,
  action: Action,
  resource: string,               // concrete ARN of the target
  context: ConditionContext,      // { mfaPresent, sourceIp, currentTime, orgId, resourceOwner, ... }
  policies: PolicyDocument[],     // flattened set already resolved for this principal
}): { decision: "allow" | "deny", reason: string }
```

### Algorithm (AWS semantics)

1. Start at **implicit deny** (default-deny).
2. Gather every statement across all supplied policies whose `action` matches
   the requested action **and** whose `resource` pattern matches the target ARN
   **and** whose `condition` (if any) is satisfied by `context`.
3. If any matched statement has `effect:"Deny"` → **explicit deny wins**, return
   `deny` immediately.
4. Else if any matched statement has `effect:"Allow"` → return `allow`.
5. Else → return `deny` (implicit — nothing granted it).

The `reason` string names the deciding statement (`sid` / policy name) so audit
logs and the console can explain *why* access was denied. This is a first-class
feature, not debug output.

### Matching details

- **Action match:** exact, or segment-wildcard (`properties:*`, `*`).
- **Resource match:** ARN pattern matching with `*` per segment and a trailing
  `*` on the id portion. No regex from user input — patterns are tokenized by
  `:` and `/` and compared segment-by-segment, so a malicious policy string
  cannot cause catastrophic backtracking.
- **Condition operators (bounded v1 set):** `StringEquals`, `StringNotEquals`,
  `Bool`, `IpAddress`, `DateGreaterThan`, `DateLessThan`.
- **Condition keys (v1):** `mr:OrgId`, `mr:ResourceOwner`, `mr:MfaPresent`,
  `mr:SourceIp`, `mr:CurrentTime`.
- Unknown operator or key → the statement **fails closed** (treated as
  non-matching), never throws.

### Cross-plane isolation

A platform-plane principal is evaluated against platform policies; an org
principal against that org's policies + the seeded org-system policies. The two
never mix in one evaluation — a `plane` mismatch between principal and resource
is an automatic implicit deny. This enforces tenant isolation at the engine
level.

The engine is deterministic and side-effect-free: same inputs → same decision,
no DB, no clock read (time arrives via `context.currentTime`).

---

## 5. Resolution, caching & the `authorize()` guard

The engine is pure, but feeding it requires I/O: turning a logged-in identity
into a flattened policy set.

### `resolveEffectivePolicies(principalArn)`

1. Look up the principal's `IamGroupMembership` rows → group ids.
2. Load those `IamGroup`s → collect `attachedPolicyIds`.
3. Load those `IamPolicy` documents → return the flattened `PolicyDocument[]`.

Three indexed reads, run on **every** API request, so **Redis-cached**:

- Key `iam:eff:{globalVersion}:{principalArn}` → JSON of the flattened policy
  set, TTL ~5 min. `globalVersion` is a monotonic counter stored at
  `iam:policyVersion`.
- **Invalidation on write:** any mutation to a group's membership, a group's
  attached policies, or a policy's document invalidates. Because such mutations
  are rare vs. reads, invalidation is intentionally **broad over clever**:
  - **Policy or group edit** (affects potentially many principals) → `INCR
    iam:policyVersion`. Every subsequent read computes a new cache key, so the
    entire old generation is orphaned at once and expires by TTL — no `SCAN`, no
    wildcard delete, atomic.
  - **Single membership edit** (affects one principal) → `DEL` that principal's
    current-version key directly.

  Correctness over exact fan-out.
- Cache stores only resolved documents, never decisions (decisions depend on
  per-request `context`).

### The guard — `authorize(auth, action, resourceArn, context?)`

```ts
async function authorize(auth, action, resourceArn, contextOverrides?) {
  const principalArn = principalArnFor(auth);                     // user or operator
  const policies = await resolveEffectivePolicies(principalArn);  // cached
  const context  = buildContext(auth, contextOverrides);          // mfa, ip, time, orgId, resourceOwner
  const result   = evaluate({ principalArn, action, resource: resourceArn, context, policies });
  if (result.decision !== "allow") throw ErrUnauthorized;         // → 403, reason logged to audit
}
```

This single function **replaces** `assertOrganizationAdmin`,
`assertOrganizationAdminOrManager`, `assertWriteRole`, and every inline
`auth.role !== ADMIN` check. Routes move from role-thinking to
capability-thinking:

```ts
// before:  await assertOrganizationAdmin({ userId, organizationId });
// after:   await authorize(auth, "audit:List", arn.audit(auth.organizationId, "*"));
```

### Integration point

`withAuth` already produces `AuthResult`; `authorize` consumes that same object,
so the cookie / JWT / refresh machinery is unchanged. The IAM layer sits between
`withAuth` and the handler body. `buildContext` reads `mfaPresent` from the JWT
payload, `sourceIp` from request headers, and `currentTime` from the server
clock (injected here so the engine stays pure).

### Org-owner special case

The org owner remains implicitly all-powerful **within their org**, but this is
now expressed as an automatically-attached seeded `OrgAdmin` group at
org-creation time — not a hardcoded `role: ADMIN` branch. Owners flow through the
same evaluation path as everyone else: one code path for all authz.

---

## 6. Platform tier, bootstrap & migration

### Platform plane

A parallel set of the same primitives, scoped to `plane:"platform"`,
`orgId:null`:

- Principals are `IamOperator`s (staff), never ordinary tenant users.
- Seeded system policies: `PlatformAdmin` (`*` on `mr:platform:*`),
  `PlatformSupport` (read-only across tenants), `PlatformBilling`, `PlatformIam`
  (manage operators / policies). These attach to seeded platform groups
  (`platform-admins`, `platform-support`, …).
- Platform actions operate on tenant-spanning resources: `organizations:List`
  across all orgs, `organizations:Suspend`, `settings:Update` for global config.
- **No impersonation** — an operator never becomes a tenant user; they act with
  explicit, audited `platform:*` capabilities.

### Bootstrap — the first super-admin (security-critical)

There is **no self-service path to platform access.** The first operator is
created by a guarded CLI / seed step gated on a server-side env secret:

```
yarn iam:bootstrap-operator --email <existing-user-email>
```

It requires `IAM_BOOTSTRAP_SECRET` in the server env, links an existing,
already-registered user to a new `IamOperator`, and adds them to
`platform-admins`. It **refuses to run if any operator already exists**
(one-time). No HTTP endpoint can mint platform access — only this offline,
secret-gated script. This is deliberately the least convenient part of the
system.

### Migration mapping (old roles → IAM)

The old `admin/manager/viewer` semantics are preserved exactly as three seeded
system policies, so no one's effective access changes on cutover:

| Old `IOrganizationRole` | Seeded system policy | Grants |
|---|---|---|
| `admin` | `OrgAdmin` | `*` on `mr:org:*:{orgId}:*` |
| `manager` | `OrgManager` | all read + write CRUD, **minus** `iam:*`, `organizations:RemoveMember`, `organizations:Delete` |
| `viewer` | `OrgViewer` | `*:Read`, `*:List` only |
| org owner (implicit admin) | auto-join `OrgAdmin` group at org creation | same as admin |

A one-time **data migration** reads every existing
`organization_members.permission` and creates the matching
`IamGroupMembership` into that org's seeded `OrgAdmin/Manager/Viewer` group.
After migration the old `permission` field is retained read-only for one release
as a rollback safety net, then dropped in a follow-up.

---

## 7. Error handling

Everything fails closed and stays in the existing error vocabulary:

- Any authz failure → `throw ErrUnauthorized` → 403, with the engine's `reason`
  written to the audit log (not leaked to the client — the client gets a generic
  403).
- Resolution I/O failure (Redis down, DB read error) → **fail closed**, deny,
  log. A cache miss is fine (falls back to DB); a hard DB failure denies rather
  than opening.
- Malformed policy documents can never reach the engine: policies are
  Zod-validated on write, and the engine treats any unparseable statement as
  non-matching.
- Unknown action / condition-key / operator → non-matching (implicit deny),
  never a throw.

---

## 8. Testing strategy

Maps directly to the full-stack-validation bar (≥95% real coverage, evidence
over assertion).

- **Engine (pure) — exhaustive unit tests, ≥95%:** default-deny, single-allow,
  explicit-deny-overrides-allow, wildcard action/resource matching, every
  condition operator (true + false + missing-key + unknown-op), cross-plane
  isolation, ARN segment matching including adversarial patterns. Most coverage
  originates here because it is pure and fast.
- **Resolution / cache — integration tests:** membership→group→policy
  flattening, cache hit/miss, invalidation on each mutation type, fail-closed on
  I/O error.
- **`authorize()` guard — integration tests:** context building (mfa/ip/time),
  owner auto-admin path, 403 mapping.
- **Migration — equivalence test:** seed legacy `organization_members`, run the
  migration, and assert effective decisions are identical before/after for a
  matrix of role × action × resource. This is the safety proof for "replace
  everything up front."
- **Route re-drive (full-stack-validation):** every migrated route exercised
  with Playwright against seeded data for admin/manager/viewer/owner + a platform
  operator, confirming reads/writes still integrate and denials 403 correctly.

---

## 9. Rollout phasing (within this sub-project)

1. Ship engine + collections + resolution + `authorize()` — **not yet wired into
   routes.** Unit / integration tests green.
2. Seed system policies / groups; run the data migration in a **shadow / dry-run**
   mode that logs what each `authorize()` *would* decide vs. what the old check
   decides, across live traffic — catch mismatches at zero risk.
3. Flip reads to `authorize()`, then writes, service by service.
4. Remove the old `assert*` helpers and the `role` branches; drop the legacy
   `permission` field in the following release.

---

## 10. Module layout (proposed)

```
src/server/iam/
  arn.ts              // arn() builder + Action union (closed sets)
  engine.ts           // evaluate() — pure function
  resolve.ts          // resolveEffectivePolicies() + Redis cache/invalidation
  authorize.ts        // authorize() guard, buildContext()
  models/
    policy.ts         // IamPolicy schema + Zod validator
    group.ts          // IamGroup schema
    membership.ts     // IamGroupMembership schema
    operator.ts       // IamOperator schema
  seed/
    system-policies.ts // OrgAdmin/Manager/Viewer + Platform* documents
  migrate/
    roles-to-iam.ts    // one-time org_members.permission → memberships
scripts/
  iam-bootstrap-operator.ts   // guarded first-operator CLI
```

---

## 11. Follow-on sub-projects (out of scope here)

1. **Admin console UI** — platform + org dashboards to view/manage operators,
   groups, policies, memberships.
2. **Per-tenant self-service policy editing UX.**
3. **Platform customization & settings** — the global config surfaced by
   `settings:*` actions.
