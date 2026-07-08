# IAM wiring + admin dashboards — plan & production-readiness map

Sub-project #2/#3 of the IAM effort. Phase-1 engine (`src/server/iam/`) is built,
tested, committed. This plan wires it into live routes and builds both admin tiers
with real backend data + analytics. Run under `full-stack-validation` discipline:
evidence over assertion, integration is the bar, fix-forward in scope, safety first,
report honestly.

## Decisions (confirmed with user)

- **Admin dashboard audience:** BOTH tiers.
  - **Platform operator console** (`/admin`) — super-admin, gated by `IamOperator`
    (platform plane). Cross-tenant analytics, org management, full IAM admin
    (operators/groups/policies/memberships), platform-wide audit feed.
  - **Org-admin IAM console** (`/settings` → IAM tab) — org owner/ADMIN manages
    their org's member↔group assignments and custom policies (org plane, OrgAdmin-only).
- **IAM enforcement:** FULL cutover now. Replace every `assertWriteRole` (26 sites)
  and `assertOrganizationAdmin` (5 sites) with `authorize()`, add read-authz to
  domain GETs. Behaviour preserved by the seeded system policies + equivalence tests.
  `yarn iam:migrate` is a REQUIRED deploy step (existing org members otherwise hit
  default-deny). New orgs already seed on creation; ongoing changes stay in sync via
  the new sync layer.

## Stack (discovered)

Next.js 16.2.6 App Router, React 19, **styled-components** (no Tailwind), **SWR** +
axios client, custom SVG charts (`GroupedBarChart`/`Donut`/`Gauge`/`HBarList`),
design primitives in `src/components/`, feature UI in `src/libs/*Wrapper/`, nav is a
hardcoded `TAB_ITEMS` array. Mongoose 9, ioredis, Zod v4, vitest v4, Biome.
Routes: `withApiHandler({route}, withAuth(async ({req, auth, context}) => …))`.

## Authz cutover — action/ARN mapping

Every org-plane call: `await authorize(auth, "<svc>:<Verb>", arn.org.<svc>(auth.organizationId ?? "*", id?), { req })`.
Personal scope (`organizationId === null`) passes via in-engine `selfScopePolicy`.

| Route (method)                                   | Old guard                    | New `authorize` |
|--------------------------------------------------|------------------------------|-----------------|
| properties POST / [id] PUT,DELETE / [id]/units POST | assertWriteRole           | properties:Create/Update/Delete, units:Create |
| units [id] PUT,DELETE                             | assertWriteRole              | units:Update/Delete |
| tenants POST / [id] PUT,DELETE                    | assertWriteRole              | tenants:Create/Update/Delete |
| tenants [id]/transactions POST / [txId] PUT,DELETE | assertWriteRole            | tenants:Update (txn is tenant sub-resource) |
| tenants [id]/portal-link POST                     | assertWriteRole             | tenants:GeneratePortalLink |
| tenants [id]/send-reminder POST                   | assertWriteRole             | tenants:SendReminder |
| documents POST / [id] DELETE                      | assertWriteRole             | documents:Create/Delete |
| maintenance POST / [id] PUT,DELETE                | assertWriteRole             | maintenance:Create/Update/Delete |
| vendors POST / [id] PUT,DELETE                    | assertWriteRole             | vendors:Create/Update/Delete |
| organizations [id] PATCH,DELETE                   | assertOrganizationAdmin     | organizations:Update/Delete |
| organizations [id]/members POST                   | assertOrganizationAdmin     | organizations:InviteMember |
| organizations [id]/members/[memberId] PATCH,DELETE| assertOrganizationAdmin     | organizations:Update / organizations:RemoveMember |
| organizations [id]/invites/[token] DELETE         | assertOrganizationAdmin     | organizations:InviteMember |
| GET reads (properties/units/tenants/docs/maint/vendors/analytics/audit/dashboard) | (none) | <svc>:List or <svc>:Read |

Note: `organizations:*` is denied to OrgManager and OrgViewer by the seeded manager
policy; RemoveMember/Delete denied to manager. Matches `assertOrganizationAdmin`
(admin-only) exactly since only OrgAdmin has `organizations:*`. Reads: OrgViewer policy
grants `*:Read`/`*:List`, so every current role passes; personal scope passes via self policy.

## Membership sync (the "wire up")

`src/server/iam/sync.ts` keeps IAM memberships in lock-step with org membership so
authz stays correct as orgs change (not just at migration):
- `syncOrgMemberRole({orgId, userId, role})` — seed system groups; add to the role's
  group, remove from the other two system groups; `invalidatePrincipal`. Used on
  invite-accept (join) and role change. Leaves custom groups untouched.
- `syncOrgMemberRemoved({orgId, userId})` — remove ALL of the principal's memberships
  in the org (system + custom); `invalidatePrincipal`.
- Backstop: `resolveOrgScope` already re-derives org scope from the org document each
  request, so a removed member drops to personal scope immediately regardless of IAM.
Hook points: `acceptInvite` service, `members/[memberId]` PATCH & DELETE routes.
All best-effort (never break the org mutation), matching `createOrganization` seeding.

## Platform tier — new cross-tenant services (`src/server/services/platform/`)

All gated in-route by `authorize(auth, "<svc>:<Verb>", arn.platform.<svc>(...), {req})`
(platform plane → requires active operator). Cached with the repo Redis convention.
- `getPlatformOverview()` — totals across all orgs/users/properties/units/tenants,
  revenue (credit sum), MRR, occupancy, active operators, org growth series.
- `getPlatformOrganizations({search, offset, limit})` — org list + owner + member
  counts + per-org quick stats; `getPlatformOrganizationDetail({orgId})`.
- `suspendOrganization`/`activateOrganization({orgId})` — sets `deleted`/a suspend flag.
- `getPlatformAnalytics({months})` — cross-tenant monthly revenue/expenses, top orgs,
  occupancy distribution, maintenance spend.
- `listPlatformAuditEvents({...})` — cross-owner audit feed (new query, no ownerId match).

## Platform IAM admin — services + routes (`/api/admin/iam/*`)

operators (list/create/disable), groups (list/create/delete/attach/detach),
policies (list/create/update/delete), memberships (list/add/remove). Each mutation
bumps/ invalidates the IAM cache. Gated by `iam:*` on the platform plane.

## Org-admin IAM — services + routes (`/api/organizations/[id]/iam/*`)

org-scoped groups/policies list, member→group assignment, custom policy CRUD
(`managedBy:"customer"` only). Gated by `iam:*` on the org plane (OrgAdmin-only).

## Frontend

- `/admin/*` route group: operator-gated layout + sidebar; pages Overview,
  Organizations, IAM (operators/groups/policies/memberships), Analytics, Audit.
  SWR hooks → `/api/admin/*`. Reuses `Charts`, `StatCard`, design primitives.
- Settings IAM tab: members↔groups matrix, policy viewer/editor. SWR → org IAM routes.
- New nav: `/admin` entry shown only to operators (probe `/api/admin/whoami`).

## Testing / validation

- Unit tests ≥95% for every new service (sync, platform aggregates, IAM admin,
  org-admin), plus equivalence tests proving the cutover preserves old role behaviour.
- Seed realistic data (operators, orgs w/ members at each role, properties…units…
  tenants…transactions, audit events). Start services. Playwright-drive every new
  route + regression-drive existing routes (no lockouts). Capture evidence.
- Security review of the new platform surface (operator gate, IDOR across orgs,
  injection in new queries, no secret leakage, rate-limit sensitive endpoints).
- Full `yarn ts.check` + `ts.check.test` + `lint` + suite green; commit; honest verdict.

## Safety

Local/dev/test data only. Never point seeds at prod. Best-effort sync never breaks a
mutation. Cutover preserves behaviour; migration gated as a deploy step. No secret
values in code/docs/logs (per prior AWS-key incident).
