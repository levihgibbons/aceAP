# Canvas LMS integration (LTI 1.3 + LTI Advantage)

## Current status — read this first

**Not configured. Not validated against a real Canvas instance.**

- There are no Canvas credentials, no Developer Key and no Canvas sandbox for this project.
- The integration layer is implemented from the 1EdTech specifications and the public Canvas
  documentation, and is unit-tested **only against an in-repo mock platform**
  (`src/modules/integrations/lms/mockPlatform.ts`). The mock is not Canvas.
- No launch from Canvas has ever been received, no token has ever been issued by Canvas, and no
  grade has ever been sent to Canvas.
- The launch endpoint (`POST /api/lti/launch`) is implemented (see "Launch route"); its pending-link token handling is unit-tested, but the
  route has never received a real Canvas launch.
- Teacher-approved grade passback from the gradebook, the `npm run lms:sync` worker, the
  deep-linking activity picker and the outbound URL allow-list are implemented and tested against
  the mock platform only (`tests/lti-passback.test.ts`).
- The teacher's "Review Canvas roster" (NRPS → proposals only, never links accounts) and the
  DNS-rebinding defence for every outbound LMS request are implemented and tested against the mock
  platform and injected DNS answers only (`tests/lti-roster.test.ts`).

The product must never say otherwise. The code enforces this:

| Claim in the UI | Only possible when |
| --- | --- |
| Connection "verified" | `runDiagnostics` passed every check against the configured endpoints (tool key present, platform JWKS fetched and parsed, token endpoint granted the AGS score scope). It does **not** mean a launch has succeeded. |
| Grade "synced" | The platform's score endpoint answered 2xx for that job. |
| Anything else | Reported as `not_configured`, `configured_unverified`, `error`, `pending`, `blocked`, `failed` or `not_queued`. |

## Architecture

```
src/modules/integrations/lms/
  types.ts            Platform-agnostic LmsAdapter interface, shared types, typed results
  canvasAdapter.ts    CanvasLtiAdapter implements LmsAdapter (composition of lti/*)
  service.ts          Database-backed application service (connections, mappings, sync jobs)
  mockPlatform.ts     TESTS ONLY — in-memory mock LTI platform
  lti/
    keys.ts           Tool RSA key, public JWKS, JWT signing
    oidc.ts           Third-party-initiated login, HMAC state tokens
    launch.ts         id_token validation, nonce store, role helpers
    deepLinking.ts    Deep Linking 2.0 response
    token.ts          OAuth2 client-credentials (JWT client assertion), token cache, HTTP error mapping
    ags.ts            Assignment and Grade Services 2.0 (line items, scores)
    nrps.ts           Names and Role Provisioning Services 2.0 (roster)
src/app/api/lti/
  jwks/route.ts       GET  public JWKS
  login/route.ts      GET|POST OIDC login initiation
  launch/route.ts     id_token validation → sign-in of a linked user or the /lti/link confirmation;
                      deep-linking requests → /lti/deep-link picker
  deep-link/route.ts  POST picker submit → signed LtiDeepLinkingResponse auto-posted to the LMS
src/modules/integrations/lms/
  passback.ts         teacher-approved grade passback, status read model, retry, sync worker + back-off
  deepLinkFlow.ts     deep-link session token, picker data, content items, response
  roster.ts           "Review Canvas roster": NRPS → proposal snapshot (lms_roster_proposals), read model
  lti/urlPolicy.ts    outbound URL allow-list (SSRF hardening)
  lti/dnsGuard.ts     DNS-rebinding defence: resolve, refuse non-public addresses, pinned transport
src/app/lti/deep-link/page.tsx   activity picker (staff, linked account only)
src/app/teacher/classes/[classId]/canvas-roster/page.tsx   roster review (staff of the class)
scripts/lms-sync.ts              `npm run lms:sync` background worker
```

Design rules:

- Domain logic is free of Next.js/React. `fetch`, the clock, the nonce store and the JWT signer
  are injectable.
- Every network operation returns `LmsResult<T>` with a typed error:
  `not_configured`, `invalid_token`, `permission_denied`, `platform_error` (retryable), `bad_request`.
- Another LMS is added by implementing `LmsAdapter`; `service.ts` only talks to that interface.

### HTTP outcome mapping

| Platform response | Error code | Sync job effect |
| --- | --- | --- |
| 2xx | — | `synced` |
| 401 / 403, OAuth `invalid_client` / `invalid_scope`, or a requested scope missing from the token response | `permission_denied` | `blocked` |
| 5xx, 429, network failure, timeout | `platform_error` | stays `pending` (attempts + 1) until the attempt limit, then `failed` |
| other 4xx (e.g. 400, 404, 422) | `bad_request` | `failed` immediately |
| tool key missing | `not_configured` | `blocked` |

A 401 on a cached access token triggers exactly one retry with a fresh token before it counts.

## Data mappings

| Canvas | AceAP | Table | How it is created |
| --- | --- | --- | --- |
| Issuer + Developer Key (client id) + deployment id | Organisation | `lms_connections` | `saveConnection` (staff of the organisation). One row per deployment. |
| Course (`context.id` claim) | Class | `external_course_mappings` (+ `memberships_url` for NRPS) | `mapCourse` — explicit, same organisation only. Called by `maybeMapAssignment` on an **instructor** launch of a deep-linked AceAP assignment the instructor teaches: the launch's course is mapped to that assignment's class with the NRPS `context_memberships_url` (dropped if it fails the URL policy). A course already mapped to a different class is never re-pointed. |
| User (`sub` claim) | AceAP user | `external_identity_mappings` | `linkIdentity` — only from a launch made while the AceAP user is signed in (`lti_launch_signed_in`) or after an administrator confirmed it (`admin_confirmed`). **Never inferred from matching names or e-mail addresses.** An LMS user already linked to someone else is never re-pointed; one AceAP user cannot have two LMS identities on one connection. |
| Assignment / resource link (`resource_link.id`) | Assignment | `external_assignment_mappings.resource_link_id` | `mapAssignment` |
| Line item (grade column) | Assignment | `external_assignment_mappings.line_item_url` | `mapAssignment` with the `lineitem` URL from the AGS claim of a launch (or from a line item lookup/creation). |
| Course roster member (NRPS) | — (proposal only) | `lms_roster_proposals` | `reviewCanvasRoster` — a teacher-requested snapshot; creates **no** identity link and **no** enrolment. See "Roster review". |

Names and e-mail addresses from a launch or roster are passed through only when Canvas sends them
(this depends on the tool's privacy level) and are never used for linking.

## Sequences

### 1. Launch (OIDC third-party-initiated login)

1. Canvas → `GET|POST /api/lti/login` with `iss`, `login_hint`, `target_link_uri`, `client_id`,
   `lti_message_hint`, and a deployment id (`lti_deployment_id`; Canvas documents `deployment_id` —
   both are accepted).
2. `login/route.ts` looks up the connection by issuer + client id.
   Unknown issuer/client/deployment → **400 JSON** (`not_configured`). Known connection but no tool
   key → 503.
3. The tool creates a `nonce` and a stateless `state` token: an HMAC-SHA256-signed payload containing
   the nonce, issuer, client id, deployment hint, `target_link_uri` and a 10-minute expiry. The HMAC
   key is derived from the tool private key (or injected). It also sets a short-lived
   `aceap_lti_state_<hash>` cookie (`Secure; HttpOnly; SameSite=None`) as a best-effort browser binding.
4. 302 to the connection's `auth_login_url` with `scope=openid`, `response_type=id_token`,
   `response_mode=form_post`, `prompt=none`, `client_id`, `redirect_uri` (`…/api/lti/launch`),
   `login_hint`, `state`, `nonce`, `lti_message_hint`.
5. Canvas → `POST /api/lti/launch` with `id_token` and `state`.
6. `validateLaunch` accepts the launch only if all of these hold:
   state HMAC valid (constant-time compare) and not expired · id_token signed (RS256) by a key in the
   platform JWKS · `iss` is the issuer the login was started for · `aud` contains the client id (and
   `azp` equals it when there are several audiences) · `exp`/`iat` valid with 60 s tolerance · `nonce`
   equals the state's nonce and has not been used before · the deployment id belongs to a configured
   connection (and matches the login hint) · LTI version `1.3.0` · message type
   `LtiResourceLinkRequest` or `LtiDeepLinkingRequest` · required claims present ·
   `target_link_uri` equals the one from the login request.
7. The result is a typed `LaunchContext` (issuer, deployment, user `sub`, roles, context, resource
   link, custom parameters, AGS and NRPS endpoint claims, deep-linking settings) or a typed error
   with a machine-readable `reason`.

#### Launch route (implemented: src/app/api/lti/launch/route.ts, src/modules/integrations/lms/launchFlow.ts, src/app/lti/link)

Because Canvas posts the launch cross-site, the SameSite=Lax session cookie is not sent with it. A
linked LMS user is signed in directly; an unlinked one gets a 10-minute HMAC-signed pending-link token
and a top-level redirect to `/lti/link`, where the signed-in AceAP user explicitly confirms the link
(`linked_via = lti_launch_signed_in`). Instructor launches of a deep-linked assignment they teach record
the resource link and line item via `mapAssignment`. Deep-linking requests continue to the activity
picker (see "Deep linking"); an unlinked LMS user first goes through the same `/lti/link`
confirmation and then on to the picker. Destinations are limited to assignments the user can access
in the connection's organisation. The original design notes follow.

`launch.ts`, `oidc.ts` and `service.ts` export everything the route needs:

```ts
const form = parseLaunchForm(await request.formData());            // id_token + state
// optional: require the cookie named stateCookieName(form.value.state) when the browser sent it
const launch = await adapter.validateLaunch({                      // module-level createCanvasAdapter()
  idToken: form.value.idToken, state: form.value.state,
  connections: findConnectionsForIssuer,                           // database lookup
});
```

Then, on success:

1. **Identity.** `getLinkedUserId(launch.connectionId, launch.userSub)`.
   Linked → the auth module may establish a session for that user.
   Not linked → require a normal AceAP sign-in, then `linkIdentity(connectionId, userSub, signedInUserId, "lti_launch_signed_in")`.
   Never match on `launch.userEmail` / `launch.userName`.
2. **Course.** For an instructor launch (`isInstructor(launch.roles)`) with a context, let the teacher
   choose one of their classes, then `mapCourse({ connectionId, externalCourseId: launch.context.id, classId, membershipsUrl: launch.nrps?.contextMembershipsUrl })`.
3. **Assignment.** When `launch.custom.aceap_assignment_id` is present (set by deep linking) and the
   caller is authorised for that assignment:
   `mapAssignment({ connectionId, assignmentId, resourceLinkId: launch.resourceLink.id, lineItemUrl: launch.ags?.lineItemUrl ?? undefined })`.
4. **Deep linking.** For `LtiDeepLinkingRequest`, show a picker, then
   `adapter.buildDeepLinkingResponse(...)` and return `renderDeepLinkingForm(response)`.
5. On any validation failure: show `error.message`; create no session and no mapping.

Open points the route owner must decide: see "Not implemented" (cookie fallback, iframe headers).

### 2. Deep linking (implemented, mock-tested)

1. An instructor opens the AceAP placement in Canvas (e.g. assignment selection). Canvas launches with
   message type `LtiDeepLinkingRequest` and the `deep_linking_settings` claim.
2. `POST /api/lti/launch` validates the launch exactly like a resource launch. Then:
   - tool key missing → honest 503 page (the response could not be signed);
   - `deep_link_return_url` must pass the LMS URL policy (see "Outbound URL allow-list");
   - the validated settings (return URL, `data`, accept flags) are stored in a **20-minute
     HMAC-signed deep-link session token** (same construction as the pending-link token);
   - LMS user already linked to an AceAP **staff** account → that user is signed in and sent (303,
     top-level) to `/lti/deep-link?token=…`; linked to a student account → 403 page;
   - not linked → the `/lti/link` confirmation (the pending-link token carries the deep-link token),
     then on to the picker.
3. `/lti/deep-link` (signed-in AceAP user required) re-checks that the signed-in account **is** the
   AceAP account linked to the launching LMS user, and lists the classes they teach (all classes for a
   school admin of the organisation) in the connection's organisation, with their active assignments.
   Checkboxes when `accept_multiple`, radio buttons otherwise. Only linking existing assignments is
   supported; creating one is a link to the normal "New assignment" page in a new tab.
4. The form posts to `POST /api/lti/deep-link` (same-origin check on `Origin`/`Referer`, session
   cookie). It re-verifies the token, the account link and that every chosen assignment belongs to the
   user's classes in that organisation, then calls the adapter's `buildDeepLinkingResponse`: a JWT
   signed with the tool key — `iss` = client id, `aud` = platform issuer, `nonce`, message type
   `LtiDeepLinkingResponse`, version `1.3.0`, deployment id, the echoed `data` value, an optional
   `msg`, and one content item per assignment:

   ```json
   {
     "type": "ltiResourceLink",
     "title": "<assignment title>",
     "url": "<APP_BASE_URL>/api/lti/launch",
     "custom": { "aceap_assignment_id": "<assignment uuid>" },
     "lineItem": { "scoreMaximum": 100, "label": "<assignment title>", "resourceId": "<assignment uuid>" },
     "window": { "targetName": "_blank" }
   }
   ```

   (`scoreMaximum` is the assignment's points.) "Cancel and return" sends a response with no content
   items so the LMS can close its dialog. `lineItem` is always included (the spec says a platform with
   `accept_lineitem: false` ignores it). An audit row `lms.deep_link_returned` is written.
5. The response page auto-submits `JWT=<token>` to `deep_link_return_url` (one hashed inline script
   under its own CSP `default-src 'none'`; a visible button is the fallback; everything is
   HTML-escaped).
6. Later launches of that link carry `aceap_assignment_id` back; the first **instructor** launch
   records the resource link and the AGS `lineitem` URL (`maybeMapAssignment`), which is what makes
   "Send grades to Canvas" possible for that assignment.

Checked against the 1EdTech Deep Linking 2.0 text (§3.2): `ltiResourceLink` properties (`url`,
`title`, `custom`, `lineItem`, `window` all optional; `lineItem.scoreMaximum` required, `label` falls
back to the title), `window` sub-properties (`targetName`, `width`, `height`, `windowFeatures`, all
optional), and `url` falling back to the tool's base launch URL when absent. Not confirmed: Canvas
does **not** document honouring `window` on deep-linked items (its deep linking page lists `iframe`
but not `window`).

### 3. Roster (NRPS)

1. `NrpsClient.fetchRoster(connection, membershipsUrl)` — the URL comes from the
   `namesroleservice` claim of a launch and is stored on the course mapping.
2. An access token is requested for
   `https://purl.imsglobal.org/spec/lti-nrps/scope/contextmembership.readonly`.
3. `GET` with `Accept: application/vnd.ims.lti-nrps.v2.membershipcontainer+json`; pagination follows
   the `Link: <…>; rel="next"` header (same host only, capped at 100 pages).
4. Each member is returned with `userId`, `roles`, `status`, and `name` / `email` etc. **only when
   provided**.

The roster is **never** written to class enrolments and never creates identity links. Its only use
is the teacher's roster review below.

#### Roster review — proposals only (implemented, mock-tested)

`src/modules/integrations/lms/roster.ts`, page `/teacher/classes/[classId]/canvas-roster` (linked
from the class's Settings page).

- **Who:** staff of the class (`assertClassStaff`: the class teacher, a school admin of its
  organisation, a platform admin). Others get "not found". Rate limited (10 reviews / 10 min per user).
- **When:** the class has a course mapping with a memberships URL (see "Data mappings" — created by
  the teacher's instructor launch of an AceAP assignment from that Canvas course). Otherwise the page
  explains how a course gets linked and offers no review.
- **"Review Canvas roster"** fetches NRPS for every mapped course of the class (cross-listed courses on
  one connection are merged; roles united) through the adapter — the URL policy and the DNS-rebinding
  guard apply to every request — and replaces the class's snapshot for that connection in
  `lms_roster_proposals`. If a fetch fails, the previous snapshot is kept and the error is shown.
  Snapshots of connections no longer mapped to the class are dropped. Audit row
  `lms.roster_reviewed` (connection ids, member and state counts, `identityLinksCreated: 0`; no names
  or e-mail addresses).
- **Stored per member:** connection, class, external user id, roles, status (`active` / `inactive`),
  name and e-mail **only if Canvas sent them**, `match_state`, `suggested_user_id` (suggestions only),
  `linked_user_id` (`already_linked` only), `created_at`.
- **Matching rules** (`classifyRosterMembers`, pure):

  | `match_state` | Rule |
  | --- | --- |
  | `already_linked` | an explicit identity link (`external_identity_mappings`) on the connection points to a student actively enrolled in this class |
  | `linked_elsewhere` | an explicit identity link exists, but that AceAP account is not in this class (the account is not recorded) |
  | `suggested` | no link; an **active Learner** whose Canvas e-mail equals (trimmed, case-insensitive) the account e-mail of exactly **one** student actively enrolled in **this class** who has no link on the connection, and no other Canvas member shares that e-mail |
  | `no_match` | everything else — same name with a different e-mail, an e-mail of a student in another class only, an inactive member, an ambiguous e-mail, a non-Learner role, or no e-mail sent |

  Names are carried for display only and are **never** consulted. Suggestions are **never applied**.
- **The page shows:** suggestions; students enrolled in AceAP with no Canvas link (live, with a
  "suggested" hint); Canvas learners not in the class (with "has a linked AceAP account that isn't in
  this class" where applicable); Canvas members linked and enrolled; a count of non-Learner members
  (not listed). Snapshots older than 30 days are not shown.
- **Actions — none links accounts:** "Copy invite message" (join code + "then open AceAP from Canvas
  and confirm the link") for Canvas learners not in the class, and "Copy 'ask to link' message"
  (explains that the student links by launching AceAP from Canvas, which uses the explicit `/lti/link`
  confirmation). There is deliberately **no** teacher or admin action that creates an identity link.
- **Data minimisation:** each review replaces the previous snapshot; `npm run retention -- --apply`
  deletes proposals older than 30 days (`rosterProposals` in the report); deleting the class or the
  connection cascades; an account deletion request deletes proposals that point at the account.
- **Database:** migration `0004_lms_roster_proposals` (table, FKs with `ON DELETE CASCADE`, unique
  `(connection_id, class_id, external_user_id)`), `0005_lms_roster_proposals_rls` (RLS enabled, all
  privileges revoked from `aceap_app` — service-only; the page authorises with `assertClassStaff`).

### 4. Grade passback (AGS) — teacher-approved

Grades are **never queued automatically** when a grade changes. A teacher sends them:

- **Gradebook → column header "Canvas: …" → drawer → "Send grades to Canvas"** (one assignment), or
  **"Send all linked grades to Canvas"** above the grid (every assignment of the class whose mapping
  has a line item URL), or the **"Canvas grade sync"** section of the assignment page.
- The control is enabled only when the class's organisation has an LMS connection whose diagnostics
  passed (and the tool key is still configured) **and** the assignment has an external mapping with a
  line item URL **and** at least one assigned student has linked their LMS account. Otherwise it is
  disabled with the honest reason: no connection · connection not verified · assignment not linked ·
  grade column (line item) not known yet · student accounts not linked. If only some students are
  linked, sending is allowed and the others become `blocked` jobs with the reason. Column headers
  show the "Canvas: …" control only when the school has a connection; the class bar always shows.
- Authorisation: staff of the class only (`assertClassStaff`: the class teacher, a school admin of
  its organisation, or a platform admin). Audit rows: `lms.grades_sent` (assignment) and
  `lms.class_grades_sent` (class), with counts.

`sendAssignmentGrades` / `sendClassGrades` (`src/modules/integrations/lms/passback.ts`):

1. Compute the current gradebook with `getGradebook` (overrides applied). Skip excused cells and cells
   without a grade (never sent as zero); skip students the assignment isn't assigned to.
2. `enqueueGradeSync({ connectionId, assignmentId, studentId, scoreGiven = percent / 100 × points
   (2 decimals; may exceed points with extra credit), scoreMaximum = points, comment? })` per student.
   The gradebook comment is included only when the teacher ticks "Include gradebook comments".
   `idempotencyKey = sha256(connection | assignment | student | scoreGiven | scoreMaximum)`, so
   re-sending identical grades creates no job and no score; a changed grade supersedes undelivered ones.
3. Deliver immediately: the jobs this request queued (no back-off — the teacher asked), then any other
   pending job of the connection whose back-off has elapsed. Each delivery (`processSyncJob`) sends:
   - access token for `https://purl.imsglobal.org/spec/lti-ags/scope/score` (client-credentials grant,
     `client_assertion_type=urn:ietf:params:oauth:client-assertion-type:jwt-bearer`, assertion signed
     with the tool key: `iss` = `sub` = client id, `aud` = token URL, `jti`, 5-minute expiry);
     tokens are cached per connection + scopes until `expires_in`;
   - `POST <line item URL>/scores` (query string preserved) with
     `Content-Type: application/vnd.ims.lis.v1.score+json` and
     `{ userId, scoreGiven, scoreMaximum, activityProgress: "Completed", gradingProgress: "FullyGraded", timestamp, comment? }`;
   - `userId` is the LMS user id from the identity mapping; `timestamp` is ISO 8601 with milliseconds
     and strictly increasing per line item + user.
4. Only a 2xx marks the job `synced` (and sets `syncedAt`). Every transition appends a `sync_logs` row.
5. The drawer / assignment page shows each student's status (`getSyncStatusForGrades` → not sent /
   pending / synced / failed / blocked / superseded), the gradebook score next to the last sent score
   ("send again to update Canvas" when they differ), the reason, and **Retry** for failed/blocked jobs
   (`retryGradeSync`: re-queues via `retrySyncJob` — audited — and attempts it at once when the
   connection is verified).

A grade that becomes excused or ungraded after it was sent is **not** removed from Canvas (no
"clear score" message is sent).

## Background sync (`npm run lms:sync`)

`scripts/lms-sync.ts` → `runSyncWorker` (passback.ts). One pass over every connection:

- **Dry run by default**: lists pending jobs per connection, which are due and when the others are
  next due. Contacts nobody, changes nothing.
- `--apply`: attempts each due job once (`processSyncJob`). Options: `--connection <id>`,
  `--limit <n>` (default 500 per connection), `--max-attempts <n>` (default 5).
- Connections whose diagnostics have not passed, or without the tool key, are skipped (reported).
- Exit code 1 when an `--apply` run left a job `failed`, 2 on a crash — so a scheduler can alert.

**Back-off schedule** (`retryDelayMs`): a pending job that failed with a retryable error (5xx, 429,
network/timeout) is next due `updatedAt + 1 min × 2^(attempts − 1)`, capped at 60 min:

| Failed attempts so far | Next attempt after the last one |
| --- | --- |
| 0 (new / re-queued) | immediately |
| 1 | 1 min |
| 2 | 2 min |
| 3 | 4 min |
| 4 | 8 min |
| 5 | — the job is `failed` (default limit 5; about 15 min after the first try) |

With `--max-attempts` above 5 the delays continue 16, 32, 60, 60 … min.

**Scheduling** (not provided by the app; pick one):

- cron, every 5 minutes: `*/5 * * * * cd /srv/aceap && npm run lms:sync -- --apply >> /var/log/aceap-lms-sync.log 2>&1`
- a systemd timer (`OnCalendar=*:0/5`) running the same command;
- a platform scheduler (e.g. a scheduled container job) with the app's environment
  (`DATABASE_URL`, `LTI_TOOL_PRIVATE_KEY`, `LTI_TOOL_KEY_ID`, `LTI_ALLOWED_HOSTS`).

If runs overlap, the attempt claim (compare-and-set on `attempts`) keeps two workers from sending the
same attempt; delivery stays at-least-once. With PGlite (no `DATABASE_URL`) the worker cannot run
while the dev server holds the database.

## Outbound URL allow-list (SSRF hardening)

`src/modules/integrations/lms/lti/urlPolicy.ts`. Applies to the connection's auth login, token and
JWKS URLs (validated in `saveConnection`), to AGS line item and NRPS membership URLs (validated in
`mapAssignment` / `mapCourse`), to the deep-link return URL, and **again before every outbound fetch**
(`safeFetch`: diagnostics, launch JWKS, token, AGS, NRPS):

- `https:` only; `http:` only for `localhost` / `127.0.0.1` / `[::1]`, and those hosts only when
  `NODE_ENV !== "production"`;
- no `user:password@` in the URL;
- private, loopback, link-local (incl. `169.254.169.254`), CGNAT, multicast and unspecified IP
  literals are always rejected (IPv4, IPv6, IPv4-mapped IPv6; alternative IPv4 spellings are
  normalised by the URL parser first);
- the hostname must match `LTI_ALLOWED_HOSTS` (comma-separated; `*.example.com` = any subdomain of
  example.com, not example.com itself; otherwise exact). Default `*.instructure.com,*.canvaslms.com`.
  Setting the variable **replaces** the default — add your host for a self-hosted Canvas;
- AGS/NRPS service URLs must also share the **origin of the connection's token URL**, so the bearer
  token never goes to another host (pagination links were already restricted to the first page's host);
- redirects are never followed (`redirect: "manual"`; a 3xx is a non-retryable `bad_request`).

**DNS-rebinding defence** (`lti/dnsGuard.ts`, called by `safeFetch` before every outbound request,
after the checks above):

1. the hostname is resolved with `dns.lookup(host, { all: true })` (IP literals are judged directly);
2. the request is refused (`bad_request`, "DNS rebinding protection") if **any** resolved address is
   private, loopback, link-local, unique-local, site-local, CGNAT, multicast, unspecified,
   documentation, Teredo, or an IPv4-mapped / IPv4-compatible / NAT64 / 6to4 address embedding such an
   IPv4 address; a lookup failure is a retryable `platform_error` ("could not reach the platform");
3. the request is sent through a small `node:https` transport whose socket `lookup` returns **only**
   the validated address — the name is not resolved a second time, so there is no check-then-connect
   window (no TOCTOU). TLS SNI and certificate verification still use the hostname. Redirects are not
   followed, the body is capped at 10 MB, the timeout/abort signal applies. (Node's built-in `fetch`
   would need the `undici` package for a custom `connect.lookup`; it is not a dependency.)

`localhost` / `127.0.0.1` / `[::1]` keep their development exemption (not resolved; refused in
production by the URL policy). An injected `fetch` without an injected resolver (the mock platform
in tests) does not resolve names; production code never injects `fetch`. Tests inject `resolveHost`
(adapter option) or swap `outboundDefaults` to simulate a public host resolving to `10.0.0.5`,
`::ffff:127.0.0.1`, `fd00::1` etc. Tests set `LTI_ALLOWED_HOSTS=*.example.test` for the mock platform;
the production default is tested separately.

Residual risk: an allow-listed host that legitimately resolves to a public address controlled by an
attacker is still reachable (the allow-list, not the DNS guard, limits which hosts are trusted); one
connection is opened per request (no keep-alive pooling); an outbound HTTP proxy (none is supported
today) would bypass the pinning.

## Sync status model

| Status | Meaning | Leaves the state by |
| --- | --- | --- |
| `not_queued` | (read model only) the student has no job for this assignment | `enqueueGradeSync` |
| `pending` | queued, or waiting for the next retry after a retryable error | processing |
| `synced` | the platform answered 2xx; never re-sent | a changed grade creates a new job |
| `blocked` | someone must fix something: missing assignment/line-item/identity mapping, 401/403, scope not granted, tool key missing | adding the missing mapping (automatic re-queue) or `retrySyncJob` |
| `failed` | attempt limit reached (default 5) or a non-retryable rejection | `retrySyncJob` |
| *superseded* | a newer grade for the same student and assignment was queued before this one was delivered. Stored as `failed` with `lastError` starting `superseded:`; exposed as `superseded: true`, counted separately and hidden from job lists by default. Cannot be retried. | — |

Rules:

- Re-queuing an identical grade returns the existing job; no duplicate job, no duplicate score.
- A changed grade creates a new job and supersedes undelivered older ones, so a stale grade can
  never overwrite a newer one.
- If a grade returns to a value that was queued earlier (80 → 90 → 80), the earlier job is put back
  in the queue (`requeued: true`) because its idempotency key is unique.
- Unmapped assignments or students produce a `blocked` job with a reason — never a silent drop.
- Delivery is at-least-once: two workers racing on the same job claim it by attempt number; a slow
  worker could still cause the same score to be posted twice (harmless: same value).

## Required Canvas administrator setup

Replace `https://aceap.example.org` with the deployed `APP_BASE_URL` (must be HTTPS).

1. **Create an LTI Developer Key** (Admin → Developer Keys → + Developer Key → LTI Key):

   | Field | Value |
   | --- | --- |
   | Redirect URIs | `https://aceap.example.org/api/lti/launch` |
   | Target Link URI | `https://aceap.example.org/api/lti/launch` (must be on the same origin as `APP_BASE_URL`) |
   | OpenID Connect Initiation URL | `https://aceap.example.org/api/lti/login` |
   | JWK method | Public JWK URL → `https://aceap.example.org/api/lti/jwks` |
   | LTI Advantage services (scopes) | `https://purl.imsglobal.org/spec/lti-ags/scope/lineitem`, `https://purl.imsglobal.org/spec/lti-ags/scope/score`, `https://purl.imsglobal.org/spec/lti-nrps/scope/contextmembership.readonly` (optional: `…/lti-ags/scope/lineitem.readonly`, `…/lti-ags/scope/result.readonly`) |
   | Placements | Course Navigation (`course_navigation`, `LtiResourceLinkRequest`, **`windowTarget: "_blank"`**), Assignment Selection (`assignment_selection`, `LtiDeepLinkingRequest`), Link Selection (`link_selection`, `LtiDeepLinkingRequest`). Confirm placement identifiers against the Canvas placements documentation. |
   | Privacy level | The lowest that works: `anonymous` is enough for launches and grade passback (`sub` is always sent). Use `name_only` / `public` only if roster names are wanted. |

   Equivalent JSON configuration (paste method):

   ```json
   {
     "title": "AceAP",
     "description": "AceAP AP learning platform",
     "oidc_initiation_url": "https://aceap.example.org/api/lti/login",
     "target_link_uri": "https://aceap.example.org/api/lti/launch",
     "public_jwk_url": "https://aceap.example.org/api/lti/jwks",
     "scopes": [
       "https://purl.imsglobal.org/spec/lti-ags/scope/lineitem",
       "https://purl.imsglobal.org/spec/lti-ags/scope/score",
       "https://purl.imsglobal.org/spec/lti-nrps/scope/contextmembership.readonly"
     ],
     "extensions": [
       {
         "platform": "canvas.instructure.com",
         "domain": "aceap.example.org",
         "privacy_level": "anonymous",
         "settings": {
           "placements": [
             { "placement": "course_navigation", "message_type": "LtiResourceLinkRequest", "windowTarget": "_blank" },
             { "placement": "assignment_selection", "message_type": "LtiDeepLinkingRequest" },
             { "placement": "link_selection", "message_type": "LtiDeepLinkingRequest" }
           ]
         }
       }
     ]
   }
   ```

   **Open launches in a new tab.** AceAP sends `X-Frame-Options: SAMEORIGIN` and
   `frame-ancestors 'self'`, so it cannot render inside a Canvas iframe:
   - navigation placements: `windowTarget: "_blank"` (Canvas documents it, as "Placement-specific
     Settings", for account, course, global and user navigation; putting it on the placement object
     is our reading of those docs);
   - deep-linked assignment links: AceAP's content items carry `window: { targetName: "_blank" }`
     (Deep Linking 2.0). Canvas does not document honouring it; if launches still open framed, tick
     the assignment's "Load This Tool In A New Tab" option in Canvas (unvalidated);
   - Canvas shows the deep-linking placements (assignment / link selection) inside a dialog iframe.
     `/lti/*` and `/api/lti/*` responses allow `frame-ancestors` for 'self' plus the `LTI_ALLOWED_HOSTS`
     hosts and send no X-Frame-Options; every other route stays `frame-ancestors 'self'`. Because the
     session cookie is SameSite=Lax, a user is not signed in inside that third-party frame, so the
     link/picker pages ask them to sign in in a new tab (unvalidated against real Canvas).

2. **Enable the key** (state ON) and copy its **Client ID** (the number shown in the Details column).
3. **Install the tool by Client ID**: Admin (or a course) → Settings → Apps → View App
   Configurations → + App → Configuration Type "By Client ID" → paste the client id → Install.
4. **Find the Deployment ID**: on the installed app, gear menu → Deployment Id.
5. **Enter the connection in AceAP** (Integrations page → `saveConnection`):

   | AceAP field | Instructure-hosted Canvas | Self-hosted Canvas |
   | --- | --- | --- |
   | Issuer | `https://canvas.instructure.com` (beta: `https://canvas.beta.instructure.com`, test: `https://canvas.test.instructure.com`) | the `iss` configured in `config/security.yml` |
   | Client ID | from step 2 | same |
   | Deployment ID | from step 4 | same |
   | Auth login URL | `https://sso.canvaslms.com/api/lti/authorize_redirect` (beta: `sso.beta.canvaslms.com`, test: `sso.test.canvaslms.com`; legacy `https://canvas.instructure.com/api/lti/authorize_redirect` still accepted by Canvas) | `https://<canvas host>/api/lti/authorize_redirect` |
   | Token URL | `https://<your institution>.instructure.com/login/oauth2/token` (Canvas documents `https://<canvas_domain>/login/oauth2/token`) | `https://<canvas host>/login/oauth2/token` |
   | JWKS URL | `https://sso.canvaslms.com/api/lti/security/jwks` (legacy `https://canvas.instructure.com/api/lti/security/jwks`) | `https://<canvas host>/api/lti/security/jwks` |

   `canvasEndpointDefaults(issuer)` only pre-fills these; the explicit URLs stored per connection are
   what the code uses, because self-hosted, beta and test instances differ.
6. **Run diagnostics** on the Integrations page. Only when all checks pass does the connection become
   "verified".

## Environment variables

| Variable | Purpose |
| --- | --- |
| `APP_BASE_URL` | Public base URL Canvas calls. HTTPS in any real deployment. Used for the redirect URI and to check `target_link_uri`. |
| `LTI_TOOL_PRIVATE_KEY` | PEM-encoded RSA private key (≥ 2048 bit, PKCS#8 or PKCS#1). Signs client assertions and deep-linking responses; also seeds the HMAC key for OIDC state tokens. Empty → the tool key is reported as not configured, the JWKS is empty, launches cannot start and grades become `blocked`. |
| `LTI_TOOL_KEY_ID` | `kid` published in the JWKS and JWT headers (default `aceap-lti-key-1`). |
| `LTI_ALLOWED_HOSTS` | Allow-list of LMS hosts AceAP may contact or redirect to (comma-separated, `*.suffix` wildcards). Default `*.instructure.com,*.canvaslms.com`; setting it replaces the default. See "Outbound URL allow-list". |

Generate a key (keep it out of version control; store it in the deployment's secret manager):

```sh
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out lti-tool-private.pem
```

In a single-line env file the PEM may be written with literal `\n` sequences inside quotes.
`generateDevKeyPem()` exists for tests and local experiments; it returns a PEM and never stores it.
The private key is never logged, returned by an API or included in an error message.

Key rotation is manual: set a new key **and** a new `LTI_TOOL_KEY_ID`. Only one key is published at a
time, so in-flight state tokens (≤ 10 minutes) become invalid at the moment of rotation.

## What is implemented, what is only mock-tested, what is unvalidated

**Implemented and unit-tested (67 tests in `tests/lti.test.ts`, 24 in `tests/lti-passback.test.ts`,
3 in `tests/lti-launch-flow.test.ts`, 17 in `tests/lti-roster.test.ts`; mock platform + in-memory
database):**

- Tool key loading, public JWKS, RS256 signing.
- OIDC login initiation and HMAC state tokens (tamper/expiry rejection); `GET /api/lti/jwks`,
  `GET|POST /api/lti/login`.
- Launch validation including rejections for bad signature, altered payload, wrong issuer/audience/`azp`,
  expired and future-dated tokens, wrong/missing/replayed nonce, unknown deployment, wrong LTI
  version/message type, missing claims, mismatched target; role helpers.
- Deep linking response.
- Client-credentials token requests (assertion verified by the mock against the tool JWKS), caching,
  missing-scope detection.
- AGS score publishing, line item lookup/creation; NRPS with pagination.
- Connection storage, diagnostics, explicit mappings, idempotent sync queue with retries, blocking,
  superseding, manual retry, audit and sync logs, read models.
- Teacher-approved passback end to end against the mock: received scores equal gradebook percent ×
  points, overrides honoured, excused/ungraded skipped, identical re-send creates no job or score,
  changed grade re-sent and an undelivered grade superseded, unmapped assignment / unlinked student →
  `blocked` with a reason and never synced, no/unverified connection refused, staff-of-class-only
  authorisation, retry from the gradebook.
- Back-off schedule and the `lms:sync` worker (dry run sends nothing; `--apply` honours the back-off
  and skips unverified connections).
- Deep-link picker: response JWT verified against the tool JWKS with the expected content item,
  custom parameter, line item and `window` target; wrong account / student / foreign assignment /
  single-item placement refused; unlinked deep-linking launch → `/lti/link` → picker token.
- URL allow-list: private/link-local/loopback literals, disallowed hosts, credentials and http
  rejected; allowed hosts accepted; checked before every fetch; redirects not followed.
- DNS-rebinding guard: public, private, mixed, IPv6, IPv4-mapped, NAT64/6to4 answers; DNS failure;
  no request is made when any answer is non-public; the pinned transport connects to the validated
  address while sending the original Host header (tested against a local server for a name that
  cannot resolve), never follows redirects, honours abort and the size cap.
- Roster review: every `match_state` (incl. `linked_elsewhere`); e-mail suggestions only for students
  enrolled in the class; names never used; no identity link or enrolment created; audit without
  names/e-mails; page model; re-review replaces the snapshot; other teacher / other organisation
  refused, school admin allowed; RLS denies `aceap_app`; 30-day hiding and retention purge; class and
  connection cascade; account-deletion cleanup; SSRF and DNS rebinding on the memberships URL (the
  previous snapshot is kept); course mapping from an instructor launch (never re-pointed).

**Exercised once by hand in a local dev server (no Canvas):** the gradebook column drawer and class
bar and the assignment page section, using a "verified" fixture connection on an unresolvable
`.invalid` host (grades stayed `pending` with "could not reach the platform", unlinked students
`blocked`); the picker page and its POST (signed response page with its CSP; cross-origin POST
refused).

**Tested only against the mock — behaviour of real Canvas not confirmed:**

- Everything that crosses the network: the authorization redirect, id_token contents, token
  endpoint, AGS and NRPS endpoints, error bodies and status codes, pagination headers.

**Not validated against a real Canvas instance / assumptions to confirm:**

- Whether Canvas's id_token always carries a `target_link_uri` claim equal to the login request's
  value (the spec requires it; the tool rejects a mismatch).
- The accepted `aud` of the client assertion. The tool sends the configured token URL; Canvas's
  documentation says the audience should contain the Canvas domain or the OIDC auth domain.
- The right token URL for Instructure-hosted Canvas (institution domain vs. a shared domain).
- Throttling: the tool treats 429, and 403 with "Rate Limit Exceeded" in the body, as retryable.
- Whether Canvas returns `scope` in the token response in all cases (an omitted `scope` is treated as
  "as requested", per RFC 6749).
- Canvas's acceptance of `userId` = launch `sub` in scores (Canvas documents "the lti_user_id or the
  Canvas user_id"), and its 400 on non-increasing timestamps / 422 on unknown users (both map to
  `failed`).
- Placement identifiers and whether the deep-linking placements send `accept_lineitem`.
- Whether Canvas creates the grade column from the content item's `lineItem` and then sends the
  `lineitem` URL on launches of that link (required for "Send grades to Canvas").
- Whether Canvas honours `window.targetName` on deep-linked items, and where `windowTarget` goes in
  the placement JSON.
- That AGS line item URLs share the origin of the token URL (the same-origin rule above); a Canvas
  using a vanity domain for one and `*.instructure.com` for the other would be refused.
- Teaching assistants: `isInstructor` is true only for the principal `membership#Instructor` role;
  the `Instructor#TeachingAssistant` sub-role alone does not count.

**Not implemented:**

- Signed-in use inside the Canvas iframe: LTI routes may be framed by allow-listed LMS hosts, but the
  SameSite=Lax session cookie is not sent in a third-party frame, so users finish linking/picking in a
  new tab. LTI Platform Storage (postMessage) would remove that hop.
- Automatic grade queueing: nothing calls `enqueueGradeSync` when a grade changes; teachers send.
- Clearing a score in Canvas when a sent grade later becomes excused or ungraded.
- Creating an assignment from a lesson/quiz inside the picker (it links to the normal page instead).
- LTI Platform Storage (`lti_storage_target` postMessage) for browsers that block third-party
  cookies. The state cookie is best effort; when it is absent the launch relies on the signed state
  and single-use nonce, which does not fully prevent login CSRF.
- A shared nonce store. `InMemoryNonceStore` is per process; several server instances need a
  database- or cache-backed `NonceStore` (same interface).
- Automatic line item discovery/creation in the sync queue: a job needs `line_item_url` on the
  assignment mapping (from a launch's AGS claim). `findLineItem` / `createLineItem` exist on the
  adapter but the service does not call them.
- Roster import into enrolments or identity links — **by design**: the roster review records
  proposals only, and linking stays student-confirmed. Also not built: AGS Result service, LTI Dynamic Registration, Canvas-specific score extensions
  (`https://canvas.instructure.com/lti/submission`), multiple published tool keys.

## Checklist: validating with a real Canvas sandbox

Do not mark the integration as working until every item has been observed against real Canvas.

Setup
- [ ] Deploy AceAP on HTTPS; set `APP_BASE_URL`, `LTI_TOOL_PRIVATE_KEY`, `LTI_TOOL_KEY_ID`.
- [ ] `GET /api/lti/jwks` returns exactly one RSA public key with the expected `kid`.
- [ ] Create and enable the Developer Key; install by Client ID; record the deployment id.
- [ ] Save the connection in AceAP → status `configured_unverified`.
- [ ] Run diagnostics → all three checks pass → status `verified`. Record which token URL worked.

Launch
- [ ] Course navigation launch reaches `/api/lti/login` (note whether GET or POST and the parameter
      names actually sent) and Canvas accepts the redirect.
- [ ] The id_token validates; record the real claims (target_link_uri, roles, context, AGS and NRPS
      claims, custom parameters).
- [ ] Reloading / re-posting the same id_token is rejected (`nonce_replayed`).
- [ ] A launch from a deployment that is not saved in AceAP is rejected (`unknown_deployment`).
- [ ] Launch as teacher, TA, student, and in Student View (test student); check the role helpers.
- [ ] Launch inside the Canvas iframe in Chrome, Firefox and Safari (third-party cookie behaviour,
      `X-Frame-Options`), and in a new tab.
- [ ] Unlinked user: the launch does not sign anyone in until an explicit link is made; a user whose
      Canvas e-mail matches an AceAP account is **not** linked automatically.

Deep linking
- [ ] (Needs framing allowed for LTI routes first.) Assignment selection opens AceAP with
      `LtiDeepLinkingRequest`; a linked teacher lands on the picker, an unlinked one on `/lti/link`.
- [ ] The returned item creates a Canvas assignment with the expected title, points and custom
      parameter; check whether it opens in a new tab (`window.targetName`).
- [ ] Launching that assignment delivers `aceap_assignment_id` and an AGS `lineitem` URL.

Grades (AGS)
- [ ] "Send grades to Canvas" is disabled with the right reason before the assignment is opened once
      from Canvas as the teacher, and enabled afterwards.
- [ ] `npm run lms:sync` (dry run, then `--apply`) on a schedule picks up a job left pending by an
      outage, following the back-off.
- [ ] Token request for the score scope succeeds; with the scope removed from the key, the job
      becomes `blocked` with a clear reason.
- [ ] A score appears in the Canvas gradebook for the right student with the right points and comment.
- [ ] Enqueueing the same grade twice produces one job and one gradebook change.
- [ ] Changing the grade updates Canvas; going back to the earlier value updates it again.
- [ ] A student without an identity link → `blocked`, nothing sent.
- [ ] Score for a user who is not a student in the course (expect 422) → `failed`, readable error.
- [ ] Revoke/disable the Developer Key → jobs become `blocked`; re-enable + manual retry → `synced`.
- [ ] Observe behaviour under throttling and during a Canvas outage (jobs stay `pending`, then `failed`).

Roster (NRPS)
- [ ] Roster of a course with more than one page (use `limit`) is returned completely.
- [ ] With privacy level `anonymous`, members carry no name or e-mail.
- [ ] An instructor launch of an AceAP assignment maps the course with a memberships URL;
      "Review Canvas roster" then lists the members; nothing is linked until a student launches and
      confirms on `/lti/link`.
- [ ] With privacy level `public`, an enrolled student with the same e-mail appears as a suggestion.
- [ ] The Canvas API host resolves to public addresses only (the DNS guard does not refuse it).

Sign-off
- [ ] Update this document: replace the status section with what was actually validated, on which
      Canvas environment, on which date.
