# Architecture

AceAP is a modular monolith: one Next.js 16 application whose domain logic lives
in framework-free TypeScript modules over a single PostgreSQL database.
Decisions and their reasons are in [DECISIONS.md](DECISIONS.md).

```
Browser (React 19, PWA shell)
   │  pages (server components) · server actions · /api route handlers
   ▼
src/app/**                ← thin adapters: auth check, input parsing, rendering
   │
   ▼
src/modules/**            ← domain services (no React, no Next imports)
   │   auth · curriculum · content · assessments · mastery · recommendations
   │   learning · analytics · classrooms · gradebook · vault · ai · search
   │   examprep · integrations/lms
   ▼
src/db/client.ts          ← getDb() trusted role  ·  asUser(actor) RLS role
   ▼
PostgreSQL  (PGlite locally, Postgres/Supabase in production)
```

## The learning loop

Every activity that can show what a student knows feeds the same record:

```
lesson check · guided practice · quiz · unit test · review · exam practice · assignment
        │ startAttempt → (revealHint / revealSolution / tutor) → submitResponse | saveDraftAnswer + submitAttempt
        ▼
grade (deterministic, src/modules/assessments/grading.ts)
        ▼
question_responses  (append-only, idempotent)
        ▼
mastery_evidence    (one row per response × skill, raw facts)
        ▼
mastery engine      (src/modules/mastery/engine.ts, pure)
        ▼
mastery_states (projection) + mastery_snapshots (history) + review_schedule + detected_misconceptions
        ▼
student dashboard · course/unit status · recommendations · exam readiness
teacher heatmap · student drill-down · interventions · gradebook (via grading policy)
knowledge vault concept pages and graph overlay · AI tutor context
```

Engagement (lesson progress, active time, simulation interaction, tutor use) is
recorded separately and never feeds the estimator. See
[MASTERY_ENGINE.md](MASTERY_ENGINE.md) and [ANALYTICS.md](ANALYTICS.md).

## Modules

| Module | Responsibility |
|---|---|
| `auth` | accounts, scrypt passwords, opaque DB sessions, page/API guards |
| `curriculum` | cached read models of courses → units → topics → objectives → skills, catalog |
| `content` | content schemas (blocks, question bodies), validation gate, versioned sync |
| `assessments` | attempts for every mode, hints/solutions, grading, evidence creation, rubric grading |
| `mastery` | estimator, policies, rollups, retention schedule, persistence, rebuild |
| `recommendations` | deterministic "what next" with reasons; never locks content |
| `learning` | lesson progress, learning events, student overviews and skill drill-down |
| `analytics` | active-time meter (shared by browser and server), heartbeats, daily aggregates |
| `classrooms` | classes, join codes, rosters, assignments, accommodations, teacher analytics |
| `gradebook` | mastery→grade policies, gradebook, overrides, CSV export |
| `vault` | private notes, wiki links, backlinks, concept pages, graph, sharing, export |
| `ai` | tutor provider interface, context assembly, policy enforcement, metering |
| `search` | in-process index over catalog, curriculum and the user's own notes |
| `examprep` | readiness indicators from mastery and practice (no score prediction) |
| `integrations/lms` | LTI 1.3 launch, deep linking, AGS, NRPS, sync jobs, Canvas adapter, mock platform |

## Request handling

- **Pages** are server components. They call `requireStudent()` /
  `requireStaff()` / `requireRole()` and then domain services.
- **Mutations** use server actions for forms and `/api/*` route handlers for
  interactive client components (answer submission, hints, heartbeats, tutor,
  vault editor). Route handlers validate input with Zod, call
  `requireApiUser()`, and map `DomainError` codes to HTTP statuses
  (`src/lib/errors.ts`).
- **Student-private reads** go through `asUser()`, so PostgreSQL row-level
  security enforces tenant and student boundaries even if a service filter is
  wrong. Domain writes run as the trusted role after explicit authorisation.

## Content flow

`content/courses/*.ts` (typed data) → `npm run content:validate` (schema,
references, answer keys through the real grader, KaTeX, coverage) →
`npm run content:sync` (idempotent; new version rows for changed lessons and
questions; catalog statuses recomputed) → database → cached course trees.
See [CONTENT_PIPELINE.md](CONTENT_PIPELINE.md).

## Directory map

```
content/            catalog (ap-catalog.json), course content, relationships, licensing registry
drizzle/            SQL migrations (0000 schema, 0001 row-level security)
docs/               this documentation
e2e/                Playwright browser tests
scripts/            migrate, seed, content validate/sync
src/app/            routes: / (public), /login, /signup, /app (student), /teacher, /admin, /api
src/components/     ui (design system), shell, lesson, questions, simulations, vault, tutor, teacher …
src/db/             schema.ts, client.ts
src/lib/            errors, rate limiting, small utilities
src/modules/        domain services (see table)
tests/              Vitest unit + integration tests (fresh in-memory Postgres per file)
```

## Scaling notes (not load-tested)

- Teacher dashboards read projections (`mastery_states`, `activity_aggregates`,
  `lesson_progress`, `submissions`), not raw responses; evidence is loaded only
  when a cell is opened. All hot paths are indexed (see schema).
- Shared curriculum is cached per process and invalidated on content sync.
- The in-memory rate limiter and LTI nonce store are per instance; a
  multi-instance deployment must move them to a shared store (Redis or a
  Postgres table).
- Mastery recalculation runs inline per response (a few skills at a time).
  Policy changes recalculate everything inline and should move to a background
  job before large schools adopt custom policies.
- No load testing has been performed; no specific concurrency is claimed.
