# Security, privacy and student data

AceAP handles educational records. This document lists the controls that
exist in code, how they are tested, and — just as important — what still has
to happen before a school production launch. **Controls in code do not make the
platform legally compliant on their own.**

## Authentication

- Email + password; scrypt hashes (N=16384, r=8, p=1, per-hash salt, parameters
  stored with the hash); minimum 10 characters.
- Sessions: 32-byte random opaque token in an `httpOnly`, `SameSite=Lax`
  cookie (`Secure` in production); only its SHA-256 is stored; 14-day expiry
  (`SESSION_TTL_DAYS`); expired sessions purged on sign-in; sign-out deletes the
  row.
- Sign-in is rate limited per email (8 / 10 min) and per client (40 / 10 min);
  failed attempts are audit-logged; timing is equalised for unknown accounts.
- Demo one-click sign-in works only for accounts flagged `is_demo` and can be
  disabled with `ACEAP_DEMO_LOGIN=0`.

## Account recovery and lifecycle

Code: `src/modules/accounts/` (`password.ts`, `deletion.ts`, `retention.ts`,
`profile.ts`), `src/modules/notifications/email.ts`. Tested in
`tests/account-lifecycle.test.ts` and `e2e/account.spec.ts`.

- **Password reset** (`/forgot-password` → emailed link → `/reset-password`):
  the request always gets the same answer ("If an account exists…") for known,
  unknown and deleted addresses — no account enumeration. Rate limited per
  email (3 / 15 min) and per client (10 / 15 min); redemption per client
  (20 / 15 min). Token: 32 random bytes; only its SHA-256 is stored
  (`password_reset_tokens`), 30-minute expiry, single-use (claimed atomically),
  and a new request deletes earlier unused tokens. A successful reset sets the
  new hash, **deletes all of the user's sessions**, writes `auth.password_reset`
  to the audit log, then starts one fresh session. Demo accounts may reset.
- **Email delivery** goes through an adapter. In development the "outbox"
  adapter stores messages in `email_outbox` (never delivered) for `/dev/outbox`
  (platform admins only, development only). In production without a configured
  provider sending fails and the UI says email isn't set up — it never claims a
  message was sent. `ACEAP_DEV_OUTBOX=1` (test-only) enables the outbox and an
  unauthenticated `/dev/outbox` in a production build for Playwright; it must
  never be set on a real deployment. **No real email provider is integrated
  yet.**
- **Change password** (account settings) requires the current password
  (attempts capped at 5 / 15 min), revokes every other session and is audited
  (`auth.password_changed`).
- **Account settings** (`/app/settings`, `/teacher/settings`): edit name
  (audited without the value), change password, download data (vault export for
  students; account-basics JSON `aceap.account-export` for everyone), delete
  account.
- **Self-service deletion** requires the password and typing `DELETE`. It sets
  `users.deleted_at`, revokes all sessions, removes class enrolments (teachers
  lose access immediately via RLS) and LMS identity mappings, deletes unused
  reset tokens and Canvas roster proposals that point at the account, and writes
  `account.deletion_requested`. Sign-in, existing
  sessions and reset requests all filter `deleted_at`; a deleted user sees the
  generic "email and password don't match" message. After
  `ACCOUNT_PURGE_GRACE_DAYS` (30) `purgeDeletedAccounts()` hard-deletes the
  user; cascades remove their private records. Audit rows are kept but hold only
  uuids — no names, emails or IPs are written to audit metadata.
- **Teachers who own classes cannot self-delete** (decision): classes hold
  students' work and grades that belong to the school, and there is no
  class-transfer feature yet, so the settings page explains that a school
  administrator or AceAP support must transfer or remove the classes first. The
  purge skips (and reports) any such account rather than failing. Demo accounts
  cannot be deleted (they are shared fictional accounts).
- **Retention enforcement**: `npm run retention` (dry run) /
  `-- --apply`; rules and scheduling in DATABASE.md → Retention. It never
  deletes mastery evidence, responses or snapshots.

## Authorisation (defence in depth)

1. `src/proxy.ts` — optimistic redirect to `/login` without a session cookie.
2. Every page / server action / route handler re-checks session and role
   (`requireStudent`, `requireStaff`, `requireRole`, `requireApiUser`) and
   services re-check object access (e.g. `assertClassStaff`).
3. **PostgreSQL row-level security**: student-private reads run through
   `asUser()` as the restricted `aceap_app` role with the user's id bound to
   the transaction (`drizzle/0001_row_level_security.sql`). A teacher sees a
   student's records only for the course of an active class they teach;
   another school's teacher sees nothing; vault notes are visible only to the
   owner or via an explicit, revocable share (which also lapses when the
   student leaves the class); `aceap_app` can never read password hashes,
   sessions or answer keys and cannot write evidence or mastery.

Tested in `tests/authorization.test.ts` (database-level assertions), plus
`flow`, `gradebook`, `vault` and `tutor` tests.

## Web security

- All inputs validated with Zod on the server; route handlers share
  `apiHandler` (`src/lib/api.ts`), which maps errors to safe messages and
  rejects cross-origin mutations (Origin/Sec-Fetch-Site check on top of
  SameSite cookies). Server actions get Next.js's built-in origin checks.
- No raw HTML rendering of authored or user Markdown (no `rehype-raw`);
  react-markdown strips unsafe URLs; KaTeX runs without `trust`.
- Math answers are parsed into a whitelisted AST (no `eval`, no property
  access, assignments, functions or unknown symbols).
- **Content-Security-Policy** on every page, with a fresh 128-bit nonce per
  request (`src/proxy.ts` → `src/lib/csp.ts`). The proxy forwards the policy on
  the request so Next.js stamps the nonce on its own scripts; the root layout
  reads `x-nonce` for the inline theme script. Consequently every page renders
  at request time (none are prerendered). Production policy:

  ```
  default-src 'self'; script-src 'self' 'nonce-…' 'strict-dynamic';
  style-src 'self' 'unsafe-inline'; style-src-elem 'self' 'nonce-…';
  style-src-attr 'unsafe-inline'; img-src 'self' data: blob:;
  font-src 'self' data:; connect-src 'self'; worker-src 'self';
  manifest-src 'self'; media-src 'self'; frame-src 'self';
  frame-ancestors 'self' [LTI routes: + https://<LTI_ALLOWED_HOSTS>];
  object-src 'none'; base-uri 'self';
  form-action 'self'[; upgrade-insecure-requests]
  ```

  - No `unsafe-inline`/`unsafe-eval` for scripts. `next dev` adds
    `'unsafe-eval'` (React's dev error stacks), unnonced `<style>` (HMR) and
    `ws:`/`wss:` (HMR socket).
  - Style *attributes* are allowed (`style-src-attr 'unsafe-inline'`) because
    KaTeX's server HTML and React `style` props (progress bars, heatmap, graph
    node positions) serialise as `style="…"`; `<style>`/`<link>` elements still
    need the nonce or `'self'`. `style-src 'self' 'unsafe-inline'` is only the
    fallback for browsers without the `-elem`/`-attr` directives. Residual risk:
    CSS-only injection (no script), limited because Markdown is never rendered
    as raw HTML.
  - `form-action` is omitted on `/lti/*` pages (the deep-linking return posts
    to the LMS and browsers apply `form-action` to redirects after the POST).
    `/api/lti/*` HTML responses set their own policies (the deep-linking return
    page has a hash-pinned script and `default-src 'none'`).
  - `upgrade-insecure-requests` and `Strict-Transport-Security: max-age=63072000`
    are sent only in production over https (`x-forwarded-proto` or the request
    URL) and never when `ACEAP_INSECURE_COOKIES=1` (the e2e server).
  - The proxy matcher covers all page routes and excludes `/api/`,
    `/_next/static`, `/_next/image`, icons, the manifest, `sw.js`, `robots.txt`
    and `sitemap.xml`. Prefetches are not excluded so the signed-out redirect
    still applies to them.
- API responses (except `/api/lti/*`) carry
  `Content-Security-Policy: default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'`
  (next.config.ts) and JSON success responses are `Cache-Control: no-store`.
- **Framing**: every page and API response may be framed only by AceAP itself
  (`frame-ancestors 'self'` / `'none'` for APIs, plus `X-Frame-Options:
  SAMEORIGIN` for old browsers). LTI routes — `/lti/*` pages and `/api/lti/*`
  HTML responses (launch error pages, the deep-linking return page) — are what
  Canvas opens inside its iframe, so their `frame-ancestors` adds
  `https://<host>` for each `LTI_ALLOWED_HOSTS` pattern (default
  `*.instructure.com`, `*.canvaslms.com`; non-host patterns are dropped) and
  they send no X-Frame-Options (it can't express an allow-list). The session
  cookie stays `SameSite=Lax`, so inside a third-party iframe the user is not
  signed in; pages that need a session send the user to sign in in a new tab.
- Other headers (next.config.ts, all routes): `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: strict-origin-when-cross-origin`, restrictive
  `Permissions-Policy`; `poweredByHeader` off.
- Tested in `tests/csp.test.ts` (policy builder + proxy) and
  `e2e/security-headers.spec.ts` (headers on a real production build, a nonce
  on every `<script>`, a fresh nonce per response, and **no CSP violations**
  while the KaTeX lesson + simulation, the @xyflow/react vault graph, the
  heatmap with its drawer and the gradebook run).
- **Outbound LMS requests (SSRF)**: every URL the server fetches for an LMS
  connection (platform JWKS, token endpoint, AGS, NRPS) must be https, carry no
  credentials, not be a private IP literal, and match `LTI_ALLOWED_HOSTS`;
  service URLs must share the token endpoint's origin; redirects are never
  followed (`src/modules/integrations/lms/lti/urlPolicy.ts`). **DNS rebinding**
  is blocked per request (`lti/dnsGuard.ts`): the hostname is resolved
  (`dns.lookup`, all addresses) and the request is refused if any address is
  private, loopback, link-local, unique-local, CGNAT, multicast, unspecified or
  an IPv4-mapped/NAT64/6to4 form of one; the connection is then **pinned** to
  the validated address through a `node:https` transport whose socket lookup
  returns only that address (no second resolution, so no TOCTOU window; TLS
  still verifies the certificate against the hostname). localhost is allowed
  only outside production. Tested with injected DNS answers in
  `tests/lti-roster.test.ts`. Residual risk: a trusted (allow-listed) host whose
  public address is attacker-controlled is still reachable — the allow-list is
  the trust boundary; an outbound HTTP proxy would bypass pinning (none is
  supported).
- CSV exports neutralise spreadsheet formula injection.
- Rate limits: sign-in, class joining, tutor, heartbeats/simulation events.
  With a database server (DATABASE_URL) they are stored in `rate_limit_buckets`
  (one atomic upsert per check), so they hold across every serverless instance;
  the embedded single-process database uses an in-memory store. LTI id_token
  nonces are likewise shared in `lti_nonces`. Both tables are service-only (RLS
  on, no grants to the restricted role).
- Scheduled jobs (`/api/cron/retention` daily, `/api/cron/lms-sync`) require
  `Authorization: Bearer $CRON_SECRET` (constant-time compare) and are closed
  when CRON_SECRET is unset. On the public demo the platform-admin account has
  a private password and cannot be entered with one-click demo sign-in in
  production builds (see [DEPLOYMENT.md](DEPLOYMENT.md)).
- Secrets are read only in server modules; a static test asserts no client
  component references `ANTHROPIC_API_KEY`, `LTI_TOOL_PRIVATE_KEY`,
  `DATABASE_URL` or the database client.
- No file uploads exist yet.

## Privacy by design

- **Data minimisation in analytics**: active time uses only interaction
  timestamps and page visibility. No keystrokes, pointer paths, webcam,
  microphone, browsing history or device fingerprinting.
- **AI**: the tutor receives only the current lesson/question context, the
  relevant skill's level and misconceptions, and notes the student explicitly
  attaches — never names, emails or full history. Message text is not stored
  (only usage metadata). Student records are not used for model training by
  AceAP; schools must also review the AI provider's retention terms. AI output
  is labelled as AI-generated; teacher assessment policies are enforced on the
  server before any provider call.
- **Vault**: private by default; sharing is per note, per class, revocable;
  no admin override.
- **Canvas roster review** (proposals only): stores a Canvas member's name and
  e-mail only if Canvas sent them, is replaced on every review, purged after 30
  days by retention, deleted with the class or connection, and cleaned up on an
  account deletion request. It never creates identity links or enrolments — a
  suggestion requires exact e-mail equality with a student already in the class
  and is never applied; names are never used to match. The table is
  service-only (RLS on, no grants to `aceap_app`).
- **Portability**: students can export notes and their learning record as
  documented JSON (schema `aceap.vault-export` 1.0.0) or Markdown.
- **Audit log**: account creation, sign-in (success/failure), class and
  assignment changes, grade overrides, policy publications, LMS connection
  changes, Canvas roster reviews (counts only), rubric grading, password reset
  requests/resets/changes, profile edits, account deletion requests and purges,
  retention runs.

## Not yet built (must be done before a school production launch)

- A real email provider adapter (password reset works end to end only with the
  development outbox today), and optional school SSO (OIDC/SAML) or Supabase
  Auth.
- Audit-log retention (not enforced), school-initiated deletion requests and a
  class-transfer tool for departing teachers; email-address change.
- A CSP violation-report endpoint (`report-to`) with monitoring; confirming the
  LTI framing policy against a real Canvas instance.
- Parent/guardian consent flows and age gating for users under 13 (COPPA), if
  the product is offered to them.
- Independent penetration test and dependency/CVE monitoring in CI
  (`npm audit` currently reports advisories in transitive dev dependencies —
  triage before release).
- Backups, encryption-at-rest configuration, monitoring and incident response
  (hosting-dependent).

## Legal and operational work (not code)

- FERPA: school-official designation and a data processing agreement with each
  school/district; directory-information and records-request procedures.
- COPPA, where students under 13 could use the product.
- State student-privacy laws (e.g. California SOPIPA, New York Ed Law 2-d,
  Illinois SOPPA) and state DPA templates (e.g. SDPC).
- Privacy policy, terms of service, sub-processor list (hosting, AI provider),
  breach-notification plan.
- Accessibility conformance review (WCAG 2.1 AA / VPAT) — automated axe and
  keyboard testing is in place (docs/ACCESSIBILITY.md); an expert audit with
  assistive-technology testing is not.
- Review of College Board trademark usage and of every third-party licence in
  the registry before commercial launch.
