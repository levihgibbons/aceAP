# Engagement analytics and learning events

## Principle

Engagement is reported to teachers as an **estimate of time spent learning**,
never as proof of learning, and it never changes mastery.

## Active time

Code: `src/modules/analytics/activeTime.ts` (shared by the browser tracker and
the server), `src/modules/analytics/service.ts`.

- **Open time** — the activity page was open *and visible*.
- **Active time** — open time minus any stretch longer than the inactivity
  threshold (default **60 s**, `ACTIVE_TIME_IDLE_THRESHOLD_SECONDS`) since the
  last meaningful interaction.
- A **meaningful interaction** is only a timestamp: pointer press, key press,
  scroll inside the activity, a simulation change, a submitted answer. No key
  values, pointer paths, page content, other tabs, webcam, microphone or device
  information are collected.
- Hidden tabs count as neither open nor active. Gaps of more than 5 s between
  ticks (device sleep) are not counted.
- The browser sends heartbeats (`{ sessionId, openMs, activeMs }`) every ~15 s,
  on visibility change and on page exit. The server **does not trust** them:
  `clampHeartbeat` caps open time at the wall-clock time since the session's
  previous heartbeat (+2 s) and active time at open time.
- Heartbeats update `learning_sessions` and a per-day rollup
  (`activity_aggregates`: user × course × day × kind) so teacher dashboards never
  scan raw sessions.

Example: a student opens a lesson, reads for 3 minutes, then leaves the tab
open (visible) for an hour without touching it → ~4 minutes active (3 min + the
60 s threshold), ~63 minutes open. If they switch to another tab, neither
counter advances.

Kinds: `lesson`, `practice`, `assessment`, `simulation`.

## Learning events

`learning_events` is an append-only log of purposeful events, each with user,
optional session, course/skill/objective, activity type and id, a small JSON
payload, `schema_version` and an optional idempotency key:

`LESSON_STARTED`, `LESSON_COMPLETED`, `QUESTION_SUBMITTED`, `HINT_REQUESTED`,
`SOLUTION_VIEWED`, `ASSESSMENT_STARTED`, `ASSESSMENT_SUBMITTED`,
`SIMULATION_INTERACTED`, `REVIEW_COMPLETED`, `NOTE_CREATED`,
`MASTERY_RECALCULATED`, `TUTOR_MESSAGE`.

Not logged: mouse movement, keystrokes, note or tutor message text, browsing
outside AceAP.

Observations (responses, evidence, events) are immutable; derived state
(mastery_states, activity_aggregates) can be rebuilt.

## What teachers see

Per student and class: active time (and open time) over the last 14 days, by
activity kind, daily trend, lessons completed, last active day — always labelled
"estimated active time (idle periods over N s excluded)". Completion, accuracy,
mastery and grades are shown as separate measures.

**Lessons & practice** (`/teacher/classes/[id]/practice`, one unit at a time,
in roadmap order): for every lesson — students who opened/finished it, the
share of inline checks answered right on the first try, median estimated active
time; for every exercise, quiz and test — students who tried it, the mean of
each student's best score, tries, median active time. Each step lists students
under 60% ("check in with"), the misconceptions their answers showed, and a
per-student breakdown. Read under row-level security; source:
`src/modules/classrooms/practiceReport.ts`.

Not built: psychological or behavioural profiling of any kind.
