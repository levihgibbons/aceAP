# Deployment (Vercel + Neon)

AceAP runs on Vercel with a hosted PostgreSQL database (Neon). Local
development keeps using the embedded database; nothing here changes `npm run dev`.

**Current deployment:** <https://aceap-five.vercel.app> — Vercel project `aceap`
(Git: `levihgibbons/aceAP`, production branch `main`, region `iad1`) and Neon
project `Aceap` (`aws-us-east-1`, Postgres 18). It is a **public demo** seeded with
the fictional demo world; it is not approved for real student data (see
[SECURITY.md](SECURITY.md#open-compliance-work)).

## How it fits together

| Piece | Where | Notes |
|---|---|---|
| App | Vercel (Next.js, Node functions, `iad1`) | `vercel.json` pins the framework (a project created as "Other" serves 404s), the install/build commands, region and cron jobs. |
| Database | Neon, pooled endpoint (`…-pooler…`) | Runtime `DATABASE_URL`. Pool per instance is 3 connections on Vercel (`DATABASE_POOL_MAX` overrides), idle clients released after 5 s. Transaction pooling is safe: per-request settings are `SET LOCAL` / `set_config(…, true)`. |
| Migrations, content, seed | Run from a trusted machine or CI against the **direct** endpoint | Never during the Vercel build. |
| Rate limits | `rate_limit_buckets` table | Shared across instances automatically when `DATABASE_URL` is set. |
| Scheduled jobs | Vercel Cron → `/api/cron/retention`, `/api/cron/lms-sync` | Authorised by `Authorization: Bearer $CRON_SECRET`; refused without it. Hobby plans allow daily crons only, so LMS grade sync runs once a day there (every few minutes needs Pro or another scheduler calling the same route). |

## Environment variables (Production)

| Variable | Value | Sensitive |
|---|---|---|
| `DATABASE_URL` | Neon **pooled** connection string, `sslmode=verify-full` | yes |
| `CRON_SECRET` | ≥ 16 random characters | yes |
| `LTI_TOOL_PRIVATE_KEY` | RSA PKCS#8 PEM, newlines may be written as `\n` | yes |
| `APP_BASE_URL` | `https://aceap-five.vercel.app` (or your custom domain) | no |
| `LTI_TOOL_KEY_ID` | `aceap-lti-key-1` | no |
| `AI_PROVIDER` | `none` until an Anthropic key is added (`anthropic` + `ANTHROPIC_API_KEY`) | key: yes |
| `ACEAP_DEMO_LOGIN` | `1` for the public demo, `0` to hide one-click demo sign-in | no |

Not set on purpose: `EMAIL_PROVIDER` (no provider yet — the forgot-password
page says email is not configured), `ACEAP_DEV_OUTBOX` (test-only),
`ACEAP_DEMO_ADMIN_LOGIN` (keeps the admin off one-click sign-in).

Preview deployments get **no** `DATABASE_URL`, so they fail fast with a clear
error instead of touching production data. Give previews their own Neon branch
if you want them to work.

## First-time setup / after schema or content changes

The secrets for these commands live in `.env.neon` (git-ignored):
`DATABASE_URL` (direct endpoint), `DATABASE_URL_POOLED`, `SEED_ADMIN_PASSWORD`,
`CRON_SECRET`.

```bash
npx tsx --env-file=.env.neon scripts/db-migrate.ts
```

```bash
npx tsx --env-file=.env.neon scripts/content-sync.ts
```

Seed the fictional demo world (once; it refuses to run twice). With
`SEED_ADMIN_PASSWORD` set, `admin@demo.aceap.test` gets that private password
and is not a demo account, so it cannot be entered with the published demo
password or the one-click button:

```bash
npx tsx --env-file=.env.neon scripts/seed.ts
```

Deploys happen automatically on every push to `main`. A manual production
deploy from this folder:

```bash
npx vercel@latest deploy --prod
```

## Security notes for the public demo

- Demo students and teachers share the published password `demo-password-2026`
  and one-click sign-in; anyone can change the fictional demo data. Reset it by
  truncating and re-seeding (`ACEAP_ALLOW_RESET=1` is required for a remote
  database — this deletes **everything**, including real sign-ups).
- The platform admin has a private password (in `.env.neon`). Rotate it with
  the account settings page after signing in.
- Free Neon/Vercel Hobby plans have no SLA, and Vercel Hobby is for
  non-commercial use. Schools and real student data need paid plans and data
  processing agreements with both providers.
