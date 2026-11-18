# AceAP

A mastery-based learning platform for Advanced Placement courses: interactive
lessons, AP-style practice and assessment, native simulations, a lesson-aware
AI tutor and a personal knowledge vault — all built on **one evidence-based
mastery record** that students and teachers share.

> **Status: pre-release.** Three pilot learning sequences (AP Calculus AB —
> chain rule; AP Microeconomics — firm costs and profit maximisation; AP
> Physics 1 — 1-D kinematics) and all 43 AP courses in the catalog with honest
> content status. See [docs/ROADMAP.md](docs/ROADMAP.md) for exactly what is
> implemented, tested, and still open.

## Quick start

Requirements: **Node.js 20.9+** (developed on Node 26) and npm. No database
server, Docker or cloud account is needed: locally AceAP runs an embedded
PostgreSQL (PGlite) stored in `.data/pglite`.

```bash
npm install
```

```bash
cp .env.example .env.local
```

```bash
npm run setup
```

```bash
npm run dev
```

Open <http://localhost:3000>. `npm run setup` validates the course content,
applies migrations, publishes the curriculum and seeds a **fictional** demo
world (two schools, teachers, students with different learning histories).

### Demo accounts

Every demo account uses the password **`demo-password-2026`**; the sign-in page
also has one-click demo buttons.

| Role | Email | Notes |
|---|---|---|
| Student (guided demo) | `student@demo.aceap.test` | Alex Morgan — Calculus class, no chain-rule evidence yet |
| Students with history | `avery@`, `sam@`, `riley@`, `jamie@`, `taylor@demo.aceap.test` | strong, mixed, struggling, little evidence, improved after remediation |
| Independent learner | `indie@demo.aceap.test` | no class |
| Teacher | `teacher@demo.aceap.test` | Jordan Rivera, Northfield High School (demo) |
| Teacher, other school | `teacher2@demo.aceap.test` | Lakeview Academy (demo) — for isolation checks |
| Platform admin | `admin@demo.aceap.test` | content review, licensing, audit, policies |

Rebuild the demo database at any time (stop the dev server first — the
embedded database allows one process at a time):

```bash
npm run db:reset
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` / `build` / `start` | Next.js dev server / production build / production server |
| `npm run typecheck` | TypeScript (strict) |
| `npm run lint` | ESLint |
| `npm test` | Vitest unit + integration tests (each file gets a fresh in-memory Postgres) |
| `npm run build:e2e` then `npm run test:e2e` | Playwright browser tests against a production build with an isolated seeded DB (uses local Google Chrome) |
| `npm run content:validate` | Validate authored courses (schema, references, answer keys via the real grader, KaTeX, coverage) |
| `npm run content:sync` | Publish content to the database (idempotent, versioned) |
| `npm run db:migrate` / `db:seed` / `db:reset` | Migrations / demo seed / wipe and reseed |
| `npm run lms:sync` (`-- --apply`) | LMS grade sync worker: dry run lists pending Canvas grade jobs and when each is due; `--apply` attempts the due ones with exponential back-off (schedule every few minutes — see [docs/CANVAS_INTEGRATION.md](docs/CANVAS_INTEGRATION.md#background-sync-npm-run-lmssync)) |
| `npm run retention` (`-- --apply`) | Retention enforcement: dry run prints counts; `--apply` deletes expired sessions/tokens, old dev outbox mail, Canvas roster review proposals older than 30 days and old raw telemetry, and purges accounts deleted more than `ACCOUNT_PURGE_GRACE_DAYS` ago (schedule daily — see [docs/DATABASE.md](docs/DATABASE.md#retention)) |

## Configuration

See [.env.example](.env.example).

- **Database**: leave `DATABASE_URL` empty for embedded PGlite; set it to a
  PostgreSQL 15+ / Supabase connection string for staging or production, then
  run `npm run db:migrate`, `npm run content:sync` (and optionally the seed).
- **AI tutor** (optional): `AI_PROVIDER=anthropic`, `ANTHROPIC_API_KEY`,
  `AI_MODEL`. Without them the tutor shows a "not configured" state; hints and
  worked solutions still work.
- **Canvas LTI 1.3** (optional): `APP_BASE_URL`, `LTI_TOOL_PRIVATE_KEY`,
  `LTI_TOOL_KEY_ID`, plus a connection configured by a school admin.
  `LTI_ALLOWED_HOSTS` (default `*.instructure.com,*.canvaslms.com`) is the
  allow-list of LMS hosts AceAP may contact; add your host for a self-hosted
  Canvas. Each outbound request also resolves the host and refuses private
  addresses (DNS-rebinding defence), so the Canvas API host must resolve to
  public addresses. **No live Canvas connection exists** — everything is tested against
  an in-repo mock platform only; see [docs/CANVAS_INTEGRATION.md](docs/CANVAS_INTEGRATION.md).
- **Email** (password reset): with `EMAIL_PROVIDER` unset in development,
  emails go to a local outbox you can read at `/dev/outbox` (signed in as a
  platform admin) — click the reset link there. In production no email is
  sent until a provider is configured, and the forgot-password page says so.
  `EMAIL_FROM` sets the sender. `ACEAP_DEV_OUTBOX=1` is for automated tests only.
- **Account lifecycle**: users manage profile, password, data download and
  account deletion at `/app/settings` or `/teacher/settings`.
  `ACCOUNT_PURGE_GRACE_DAYS` (default 30) and `RETENTION_EVENTS_DAYS`
  (default 730) control `npm run retention`.

## Architecture in one paragraph

A Next.js 16 modular monolith. Framework-free domain services in
`src/modules/*` (curriculum, content, assessments, mastery, recommendations,
learning, analytics, classrooms, gradebook, vault, ai, search, examprep,
integrations) sit on PostgreSQL via Drizzle. Every graded response becomes
immutable evidence; a transparent estimator turns evidence into explained
mastery states that every feature reads. Student-private reads run under
PostgreSQL row-level security. Details: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Documentation

| Doc | Topic |
|---|---|
| [PRODUCT](docs/PRODUCT.md) | Vision, users and main flows |
| [ARCHITECTURE](docs/ARCHITECTURE.md) | System design and module map |
| [MASTERY_ENGINE](docs/MASTERY_ENGINE.md) | Exact mastery calculation, policies, history, recovery |
| [DATABASE](docs/DATABASE.md) | Schema, migrations, row-level security, retention |
| [CURRICULUM](docs/CURRICULUM.md) | AP catalog, alignment, versioning, pilot scope |
| [CONTENT_PIPELINE](docs/CONTENT_PIPELINE.md) | Authoring, validation, publishing, licensing |
| [ANALYTICS](docs/ANALYTICS.md) | Active time and learning events |
| [VAULT](docs/VAULT.md) | Knowledge graph, sharing, export format |
| [CANVAS_INTEGRATION](docs/CANVAS_INTEGRATION.md) | LTI 1.3 design and setup |
| [SECURITY](docs/SECURITY.md) | Controls, privacy, open compliance work |
| [ROADMAP](docs/ROADMAP.md) | Phase status and acceptance demonstrations |
| [DECISIONS](docs/DECISIONS.md) | Architecture decision record |

## Content and trademarks

All lessons and questions are original AceAP content (AI-assisted, machine-
validated; human subject-matter review pending). College Board material is used
only as an alignment reference (course names, unit titles, links).
AP® and Advanced Placement® are registered trademarks of College Board, which is
not affiliated with, and does not endorse, AceAP.
