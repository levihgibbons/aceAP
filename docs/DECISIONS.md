# Architecture decision record

Short records of decisions that shape the codebase. Newest last.

## ADR-001 — Modular monolith on Next.js
**Decision.** One Next.js 16 (App Router) application. Domain logic lives in
framework-free modules under `src/modules/*` (curriculum, content, assessments,
mastery, recommendations, learning, analytics, classrooms, gradebook, vault, ai,
search, examprep, integrations, auth). Pages, route handlers and server actions
are thin adapters over those modules.
**Why.** The product's hardest problems are domain problems (evidence, mastery,
permissions). Keeping them out of React makes them testable from Vitest,
background jobs and seed scripts. Microservices would add operational cost
before the core product is proven.

## ADR-002 — PostgreSQL everywhere; embedded PGlite for local development
**Decision.** Drizzle ORM over PostgreSQL. With no `DATABASE_URL`, the app
uses PGlite (Postgres compiled to WASM) persisted in `.data/pglite`; with
`DATABASE_URL` it uses node-postgres (works with Supabase or any Postgres 15+).
Same migrations and row-level-security policies in both.
**Why.** Contributors can run the full product with `npm install` and no
Docker or cloud account, while production uses a real server. Tests get a
fresh in-memory database per file.
**Trade-off.** PGlite allows a single process to open a data directory at a
time: stop the dev server before running the seed script against the same
directory.

## ADR-003 — Request-time rendering (Cache Components disabled)
**Decision.** `cacheComponents` is off. Pages read the session cookie and
render per request; shared curriculum is cached in-process
(`src/modules/curriculum/queries.ts`, search index).
**Why.** Nearly every route is personalised and permission-scoped. Caching
per-user HTML adds risk (cross-user leakage) for little benefit at this stage.

## ADR-004 — Authorisation in three layers
**Decision.** (1) `proxy.ts` does an optimistic redirect when there is no
session cookie; (2) every page/action/route handler re-checks the session and
role; (3) every read of student-private data runs through `asUser()`, which
switches to the restricted `aceap_app` PostgreSQL role with the user's id bound
to the transaction, so row-level-security policies decide visibility.
Writes go through domain services that authorise explicitly.
**Why.** Hiding UI is not access control; service checks can have bugs; RLS
gives a database-enforced floor (a teacher in one school cannot select another
school's students' rows even if a service forgets a filter).

## ADR-005 — Own session auth instead of a hosted provider
**Decision.** Email + password with scrypt hashes, opaque random session tokens
(only the SHA-256 is stored), httpOnly SameSite=Lax cookies, rate-limited
sign-in.
**Why.** No external credentials are needed to run the product; the session
layer is small and replaceable (Supabase Auth or a school SSO via OIDC can be
added behind `src/modules/auth`). Account recovery by email is NOT built yet
(no mail provider) — see SECURITY.md.

## ADR-006 — Evidence is immutable; mastery is a projection
**Decision.** `question_responses`, `mastery_evidence`, `learning_events` and
`mastery_snapshots` are append-only. `mastery_states` is derived and rebuildable
(`rebuildMastery`). Weights are computed at calculation time from raw facts.
**Why.** Policy changes, bug fixes and audits must be replayable without losing
history. See MASTERY_ENGINE.md.

## ADR-007 — Transparent Bayesian-style estimator plus sufficiency rules
**Decision.** A bounded, weighted Beta-update estimator with explicit evidence
sufficiency and diversity rules (MASTERY_ENGINE.md), instead of BKT/IRT.
**Why.** It is explainable to students and teachers in plain language,
deterministic, testable, and robust to repetition and assistance. IRT/BKT can
be evaluated later against real data; the evidence log keeps everything needed.

## ADR-008 — Content as versioned, typed data with a validation gate
**Decision.** Lessons are ordered typed blocks and questions are typed bodies
(`src/modules/content/schema.ts`), authored in TypeScript files under
`content/`, validated by `npm run content:validate` (schema, references,
answer keys run through the production grader, KaTeX rendering, skill
coverage) and published by `content:sync`, which creates a new version row
whenever content changes. Attempts pin the question version they served.
**Why.** New AP courses are added through data, not new React pages; every
published answer key has been machine-checked.

## ADR-009 — Deterministic grading; expression equivalence by sampling
**Decision.** Objective items are graded by pure functions. Math expressions are
parsed with mathjs into a whitelisted AST (no assignments, property access,
function definitions or unknown symbols) and compared with the key by
deterministic numeric sampling over a domain; known wrong forms (common errors)
are matched the same way to diagnose misconceptions.
**Why.** Accepts any equivalent form (6x(x²+1)², 6x⁵+12x³+6x …) without a CAS;
safe against injection; reproducible.

## ADR-010 — Native simulations; third-party sims only with verified licences
**Decision.** Three original simulations (derivative explorer, firm behaviour
lab, motion lab) built from pure model modules. Simulation interaction is
logged as engagement only; mastery comes from questions that use the
simulation as a stimulus. PhET and OpenStax are recorded in the licensing
registry as "not used, pending review".
**Why.** AceAP is intended to be commercial; non-commercial licences don't
cover it, and iframe embeds expose no assessable telemetry.

## ADR-011 — AI tutor behind a provider interface, policy enforced server-side
**Decision.** `src/modules/ai` exposes a provider interface (Anthropic adapter
first). The tutor is unavailable (honest "not configured" state) without a key.
Teacher/assessment AI policies are checked before any provider call. Tutor help
on an open question is recorded as assistance so that answer earns reduced
mastery credit. Message text is not stored; usage is metered.

## ADR-012 — LTI 1.3 / Advantage for Canvas, built against a mock platform
**Decision.** Standards-based OIDC launch, Deep Linking, AGS grade passback and
NRPS rosters behind a platform-agnostic `LmsAdapter`, tested against an
in-process mock platform. Connection status stays "not configured" /
"configured, unverified" until diagnostics pass against real endpoints; a grade
is "synced" only after a 2xx from the platform.
**Why.** No Canvas sandbox credentials are available; the integration must not
pretend to be live. See CANVAS_INTEGRATION.md.
