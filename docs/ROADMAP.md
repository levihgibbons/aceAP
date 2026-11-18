# Roadmap and implementation status

Single source of truth for what exists. Statuses:
**Tested** (automated tests cover it) · **Implemented** (built and manually
exercised, no dedicated automated test) · **In progress** · **Not started** ·
**Blocked** (needs something external).

Last updated: 2026-11-18.

## Phases

| Phase | Scope | Status |
|---|---|---|
| 0 — Foundation | Next.js 16 + TS strict, Drizzle/Postgres (PGlite locally), migrations, lint, Vitest, Playwright, docs | Tested |
| 1 — Shell and identity | Auth (scrypt, DB sessions, rate limits), role-aware shell, design system, landing, catalog | Tested (auth/session services); UI Implemented |
| 2 — Learning and assessment | Content schema + validator + versioned sync, lesson player (all block types), question engine (7 types), deterministic grading, attempts for every mode | Tested |
| 3 — Mastery intelligence | Evidence model, estimator, sufficiency/diversity rules, policies + versions + snapshots, rollups, retention schedule, misconceptions, recommendations | Tested |
| 4 — Teacher classroom | Classes/join codes/rosters, assignments + targeting + accommodations, gradebook + grading policies + overrides + CSV, heatmap + drill-down, student profiles, interventions, engagement | Tested (services); UI Implemented |
| 5 — Pilot subjects | Calculus AB (chain rule), Microeconomics (firm costs/profit max), Physics 1 (1-D kinematics); 3 native simulations; cross-course relationships | Tested (content validator, simulation models) |
| 6 — Knowledge vault | Notes, wiki links, backlinks, concept pages, graph, sharing, JSON/Markdown export | Tested |
| 7 — AI tutor | Provider abstraction (Anthropic), context assembly with data minimisation, policy enforcement, assistance recording, metering | Tested with a fake provider; **live provider not exercised (no API key)** |
| 8 — Canvas / LTI 1.3 | OIDC login, launch + explicit account linking, deep-linking activity picker, teacher-approved grade passback from the gradebook, `lms:sync` worker with back-off, SSRF allow-list + DNS-rebinding guard with connection pinning, AGS, NRPS, roster review (proposals only), sync jobs, diagnostics, integrations UI | Tested against an in-process mock platform; **Blocked** for real validation (needs a Canvas sandbox + developer key) |
| 9 — AP exam prep | Readiness indicators, weakest vs untested objectives, practice sets, adaptive mixed set, review sequence, no score prediction | Tested |
| 10 — Hardening | RLS tenant isolation, nonce-based CSP + security headers (LMS-only framing for LTI routes), CSRF checks, static secret guard, PWA, error states | Tested (isolation, guard, CSP/headers incl. no-violation browser runs); see open items |
| 11 — Accessibility | WCAG 2.1 AA target: axe-core scans of 72 screens (light + dark subset), keyboard checks (skip link, dialogs/drawers, heatmap grid), contrast-token and semantics fixes — see ACCESSIBILITY.md | Tested (automated + keyboard); **no screen-reader testing yet**; not a conformance claim |

## Acceptance demonstrations

| Demo | What it proves | Service-level test | Browser test |
|---|---|---|---|
| A | Student learns the chain rule; graded quiz; persistent explained mastery; recommendations | `tests/flow.test.ts` ✅ | `e2e/demo-a-student-learns.spec.ts` ✅ |
| B | Teacher sees attempts in the heatmap, drills down, assigns targeted practice; student receives it | `tests/flow.test.ts` ✅ | `e2e/demo-b-teacher-mastery.spec.ts` ✅ |
| C | Idle time excluded; completing a lesson creates no mastery | `tests/flow.test.ts` ✅ | `e2e/demo-c-mastery-not-engagement.spec.ts` ✅ |
| D | Vault note links, graph, export | `tests/vault.test.ts` ✅ | `e2e/demo-d-vault.spec.ts` ✅ |
| E | Simulation question creates evidence; slider use alone does not | `tests/flow.test.ts` ✅ | `e2e/demo-e-simulation.spec.ts` ✅ |
| F | Grade policy change is previewed, published and reflected; evidence unchanged | `tests/gradebook.test.ts`, `tests/flow.test.ts` ✅ | `e2e/demo-f-grade-policy.spec.ts` ✅ |
| G | Another school's teacher is refused by services **and** the database | `tests/authorization.test.ts` ✅ | `e2e/demo-g-tenant-isolation.spec.ts` ✅ |

Browser results: **44/44 Playwright tests pass** against a production build with a freshly seeded database (Chrome, ~1.8 min): the A–G demonstrations, auth/role redirects, password reset and account deletion, every main page for each role, the 43-course catalog, the web manifest, no horizontal scroll at 360 px, CSP/security headers with zero CSP violations, and axe WCAG 2.1 A/AA scans (no serious/critical violations) plus keyboard checks.

## Verification log (2026-11-18)

- `npm run typecheck` — 0 errors.
- `npm run lint` — 0 errors, 0 warnings.
- `npm run test:e2e` — 44 passed, 0 failed.
- `npm test` — 16 files, 315 tests passed.
- `npm run content:validate` — 3 courses OK (166 questions run through the grader).
- `npm run build:e2e` (production build) — succeeded; all routes compiled.
- Manual browser pass (dev server, dark theme): landing, demo sign-in, student
  home, chain-rule lesson (KaTeX, worked example, Derivative Explorer, check
  question), teacher overview, mastery heatmap, evidence drawer. Found and fixed
  a hint that revealed an answer (now blocked by a validator rule) and an
  over-wide simulation window. Later: the teacher heatmap labelled thin-but-correct
  evidence as "difficulty"; the threshold now uses the prior mean (0.5), so only
  evidence that leans incorrect reads as difficulty.

### Canvas roster review + DNS-rebinding pass (2026-11-18)

- `npx vitest run` — 16 files, 315 tests passed (new: `tests/lti-roster.test.ts`,
  17 tests — roster proposal states, e-mail-only suggestions, no identity links
  created, authorisation, RLS, retention, SSRF/DNS rebinding on the memberships
  URL, and DNS-guard unit tests incl. a pinned-connection test against a local
  server).
- `npm run typecheck` and `npm run lint` — clean.
- Production build + `npx playwright test` — 44 passed (the a11y suite now also
  scans `/teacher/classes/[id]/canvas-roster`).
- Dev server check: the roster page with a fixture snapshot (all four sections),
  the honest error when the roster can't be fetched (previous snapshot kept),
  no horizontal scroll at 375 px, no console errors.

### CSP + accessibility pass (2026-11-18)

- `npx playwright test` — 44 passed (incl. `e2e/security-headers.spec.ts`,
  `e2e/a11y.spec.ts` and the account-lifecycle spec) on a fresh production build.
- `npx vitest run` — 15 files, 298 tests passed (incl. `tests/csp.test.ts`).
- `npm run lint` — clean. `npm run typecheck` — no errors in source; the only
  errors come from generated `.next*/types/validator.ts` files when two dist
  folders with different route sets coexist (e.g. a partial `.next/dev` next to
  `.next-e2e`); deleting the stale dist folder clears them.
- axe (WCAG 2.0/2.1 A+AA): 210 serious/critical affected nodes before → 0
  after across 62 enforced scans; details in ACCESSIBILITY.md.
- Dev server check: no CSP violations or hydration warnings with the dev policy.

## Known limitations and open work

**Product**
- Pilot content covers part of three courses; 40 courses show outline/catalog
  status only. Content is AI-assisted and machine-validated; **human
  subject-matter review is required** before school use.
- Written-response (rubric) grading is implemented but no pilot item uses it.
- Canvas: the deep-linking picker, teacher-approved "Send grades to Canvas",
  the `npm run lms:sync` worker and the teacher's "Review Canvas roster"
  (proposals only — accounts are linked only by the student from Canvas) are
  built but tested only against the in-repo mock platform. LTI routes
  (`/lti/*`, `/api/lti/*`) may be framed by the `LTI_ALLOWED_HOSTS` LMS hosts
  (other pages may not); inside the Canvas iframe the user isn't signed in
  (SameSite=Lax cookie), so session pages open sign-in in a new tab.
- No vault import yet (export format is versioned for it).
- Mastery recalculation after a policy change runs inline (fine for pilots;
  move to a background job for large schools).
- Not-found pages under `/app`, `/teacher`, `/admin` render the correct page
  but with HTTP 200, because segment `loading.tsx` starts streaming first.

**Security / operations** (detail in SECURITY.md)
- Password reset, account settings, self-service deletion (30-day purge) and
  `npm run retention` are built, but no real email provider is integrated (dev
  outbox only), retention must be scheduled per deployment, teachers who own
  classes can't self-delete (no class-transfer tool), and SSO is not built.
- Shared stores for rate limits and LTI nonces for multi-instance deployment.
- CSP with nonces is built (style attributes still allowed for KaTeX/React
  `style`; no violation-report endpoint yet). The SSRF allow-list for LMS URLs
  (`LTI_ALLOWED_HOSTS`) and per-request DNS-rebinding protection with
  connection pinning are built (tested with injected DNS answers only).
- Accessibility: automated axe + keyboard checks pass; screen-reader
  (NVDA/JAWS/VoiceOver), Safari/Firefox/mobile, forced-colours, WCAG 2.2 and
  cognitive review are not done (ACCESSIBILITY.md).
- Legal/compliance work: FERPA/COPPA/state DPAs, privacy policy, accessibility
  conformance review, trademark/licence review.

**External credentials needed**
- `ANTHROPIC_API_KEY` (AI tutor), a Canvas sandbox + LTI developer key +
  `LTI_TOOL_PRIVATE_KEY` (integration), a PostgreSQL/Supabase instance for
  hosted environments.

## Next priorities

1. Human SME review of the three pilot sequences; expand each to its full unit.
2. Validate LTI against a Canvas sandbox (launch, deep-linking picker, grade
   passback, roster review, `lms:sync` scheduling, the LTI framing policy).
3. Password reset (email provider) and school SSO.
4. Background job runner (policy recalculation, retention; LMS sync has a
   schedulable CLI worker).
5. Expert accessibility audit with assistive technology (then an ACR/VPAT);
   CSP violation reporting.
6. Learning-OS seams: versioned public API + OAuth scopes for student-approved
   access (read mastery summaries / selected notes; submit evidence through
   validation, never write mastery directly).
