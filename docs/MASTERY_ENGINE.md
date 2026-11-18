# Mastery engine

The mastery engine is the centre of AceAP. Lessons, practice, quizzes, unit
tests, review, exam practice, teacher assignments, the teacher heatmap, the
gradebook, recommendations, the AI tutor and the knowledge vault all read and
write **one** learning record. This document is the exact specification of how
that record is turned into a mastery state. If the code and this document ever
disagree, that is a bug.

Code: `src/modules/mastery/` — `engine.ts` (pure calculation), `policy.ts`
(defaults + validation), `aggregation.ts` (rollups), `retention.ts` (review
schedule), `service.ts` (persistence). Tests: `tests/mastery-engine.test.ts`.

## 1. What counts as evidence

Only a **graded response** produces evidence. Each graded response creates one
immutable row in `mastery_evidence` for every skill the question assesses:

| Field | Meaning |
|---|---|
| `score` | 0..1 from the deterministic grader (or a teacher's rubric score) |
| `difficulty` | the item's authored difficulty, 1–5 |
| `pattern` | the item's problem pattern (two items differing only in numbers share one) |
| `mode` | lesson check, guided practice, skill/lesson quiz, unit test, course review, exam practice, custom |
| `try_number` | 1 = first try at the item in that attempt; >1 = retry after feedback |
| `hints_used`, `solution_viewed`, `tutor_used` | assistance recorded **before** the answer was submitted |
| `is_retention_review` | the skill's spaced review was due when the attempt was built |
| `scoring_version`, `occurred_at`, ids of the response/attempt/question version |

The row stores raw facts only. Weights are computed by the engine at
calculation time, so a policy change can be replayed over the same evidence.

**Not evidence:** time on a page, opening or finishing a lesson, moving a
simulation slider, chatting with the tutor, viewing a solution without
answering. These are recorded as engagement (`learning_events`,
`learning_sessions`, `lesson_progress`) and never enter the calculation. The
engine's input type (`EvidenceItem`) has no field for time on task.

An answer is **independent** when `try_number = 1` and no hint, revealed
solution or tutor help was used on that item.

## 2. The estimator

For each (student, skill), start from a prior `alpha = 1, beta = 1` and process
evidence in chronological order:

```
alpha ← alpha + w⁺ · y
beta  ← beta  + w⁻ · (1 − y)
estimate = alpha / (alpha + beta)
```

`y` is the score. `w⁺` (weight on success) and `w⁻` (weight on failure) are
bounded, conservative weights:

```
base      = modeWeight[mode] × difficultyWeight[difficulty]
exposure  = repeatExposure[number of earlier answers to this same question]
retry     = retryAfterFeedback if try_number > 1, else 1
assist    = min over assistance used of { oneHint, multipleHints, tutor, solutionViewed }   (1 if none)
recency   = max(recencyFloor, recencyDecayPerLaterItem ^ (number of LATER evidence items))

w⁺ = clamp(base × exposure × retry × assist × recency, 0, maxItemWeight)
w⁻ = clamp(base × max(exposure × retry, minNegativeFactor) × recency, 0, maxItemWeight)
```

Design consequences:

- **Assisted success counts for much less** (one hint ×0.5, more hints ×0.25,
  tutor ×0.4, solution viewed ×0.1). Assistance never *reduces* the cost of a
  miss.
- **Repeating the same question has rapidly diminishing value**
  (×1, ×0.5, ×0.25, ×0.1 …). A memorised item cannot manufacture mastery; the
  count rules below additionally require distinct questions and patterns.
- **Retries after feedback** count at ×0.25 for success.
- **Recency** discounts older evidence by *how many items came after it*, never
  by elapsed time. Leaving the app for a month does not change an estimate.
- **Harder items and more reliable contexts** carry more weight (unit test 1.2,
  exam practice 1.1, quizzes 1.0, guided practice 0.6, lesson checks 0.5;
  difficulty 0.7 → 1.2), always capped by `maxItemWeight`.

> The estimate is an **evidence summary**, not a validated probability that the
> student "knows" the skill. The UI never displays it as a percentage of
> knowledge; it shows plain-language levels plus the counts behind them.

## 3. Levels require sufficient, diverse evidence

A high estimate alone is never enough. Levels are assigned top-down; the first
whose requirements are all met wins.

| Level | Requirements (default policy) |
|---|---|
| **Mastered** | estimate ≥ 0.85, effective evidence ≥ 5, ≥ 5 independent correct, ≥ 4 different questions correct, ≥ 2 different problem patterns correct, ≥ 1 independent correct on a quiz/test/review (not guided practice), correct answers in ≥ 2 separate sittings |
| **Proficient** | estimate ≥ 0.75, effective evidence ≥ 3, ≥ 3 independent correct, ≥ 3 different questions correct, ≥ 1 pattern |
| **Approaching mastery** | estimate ≥ 0.60 and effective evidence ≥ 1.5 |
| **Developing** | any graded evidence |
| **Not started** | no graded evidence |

"Effective evidence" is the total weight actually applied (Σ w⁺·y + w⁻·(1−y)).
"Correct" means score ≥ `correctThreshold` (0.8).

These are **product defaults, not scientifically validated thresholds**.
Organisations can publish their own policy (see §7).

## 4. Needs review (retention)

"Needs review" is a flag **alongside** the level. It asks for fresh evidence; it
never lowers the estimate or the level. It is raised when:

1. **dropped below proficient** — the student was once Proficient/Mastered and
   later evidence brought them below Proficient; or
2. **recent misses** — the student has been Proficient or better and at least
   2 of their last 3 independent answers were wrong; or
3. **scheduled review due** — the skill is Proficient or better and its spaced
   review date has passed.

The spaced-review schedule (`review_schedule`) starts when a skill first reaches
Proficient: next review after 3 days, then 7, 16, 35, 75. A successful
independent answer *on or after* the due date advances one stage; earlier
practice doesn't advance it. An independent miss resets to stage 0 due in
1 day. Assisted work neither passes nor fails a review. Course review attempts
prioritise due skills, and evidence from them is marked `is_retention_review`.

Only actual new performance changes the estimate.

## 5. Explanations

Every state stores an `explanation` computed from the same evidence:
attempts, independent attempts and correct answers, assisted attempts, unique
questions (and correct), distinct patterns correct, summative independent
correct, distinct sittings, effective evidence, per-pattern statistics, the
weakest pattern (when one stands out), the next level and the exact
requirements still unmet, the review reason, the peak level ever held, and the
last time the skill was demonstrated independently. The summary sentence shown
to students and teachers, e.g.

> Proficient: 4 of 5 answers correct without help, 6 different questions, 1 with
> hints or retries (counted for less). For Mastered: 1 more different type of
> problem; 1 more separate sitting with a correct answer.

is generated from those counts — nothing is hard-coded. Teachers can open any
heatmap cell to see the individual responses behind it.

## 6. Aggregation (objective → topic → unit → course)

Rollups are computed over **every skill in scope**; skills without evidence
count as Not started. Each rollup reports total skills, skills with evidence,
coverage, the count per level, the Proficient-or-better share, and a single
conservative label:

- no evidence → Not started;
- evidence on every skill → the **weakest** skill's level;
- evidence on only some skills → never above Approaching (Approaching if at
  least half the skills are Proficient+, otherwise Developing).

So a course with one mastered skill shows "Developing, 1 of 9 skills
Proficient or better, 11% coverage", not "Mastered".

## 7. Policies, versions and history

- Policies live in `mastery_policies` (platform default has
  `organization_id = NULL`). A student's mastery in a course uses the active
  policy of the school whose class they take it in, otherwise the default.
- Publishing a policy (`publishPolicy`) validates it (`masteryPolicySchema`:
  bounded weights, Mastered ≥ Proficient ≥ Approaching thresholds), inserts a
  **new version**, deactivates the old one (kept), writes an audit log entry and
  recalculates affected states.
- Every recalculation stores, on the state and in an appended
  `mastery_snapshots` row: calculation version (`aceap-mastery/1.0.0`), policy id
  and version, alpha/beta, estimate, level, review flag, evidence count, what
  triggered it (`evidence`, `policy_change`, `rebuild`, `retention`) and the
  triggering evidence id. Snapshots are never updated or deleted, so earlier
  results remain inspectable after a policy change.

## 8. Mastery vs grades

Mastery is what the evidence shows; a grade is what a teacher records. Grading
policies (`grading_policies`, `src/modules/gradebook/policy.ts`) *read* mastery
and submissions and derive a percentage:

- score-graded work: best or latest attempt, optional late penalty;
- mastery-graded work: a teacher-configured level → percentage map (default
  Mastered 100, Proficient 90, Approaching 75, Developing 60, Not started 0),
  using the current level or the highest level ever demonstrated;
- completion-graded work.

Teacher overrides are stored separately in `gradebook_entries` and never edit
responses or evidence; the computed grade remains visible as "replaced".

## 9. Misconceptions

Authored distractors and common errors are tagged with misconception ids. A
matching wrong answer opens a **hypothesis** in `detected_misconceptions` (or
increments an existing one). Each subsequent independent correct answer on that
skill counts toward resolution: 2 → *potentially resolved*, 4 → *resolved*. A
recurrence reopens it. Teachers can confirm a misconception
(`teacher_confirmed`), which is kept distinct from the algorithmic hypothesis.
Every status change is appended to the record's history.

## 10. Recovery

`mastery_states` is a projection. If it is lost or suspected stale, rebuild it
from the immutable evidence log:

```ts
import { getDb } from "@/db/client";
import { rebuildMastery } from "@/modules/mastery/service";
await rebuildMastery(await getDb(), { trigger: "rebuild" });            // everyone
await rebuildMastery(await getDb(), { userId, trigger: "rebuild" });    // one student
```

Each rebuilt state appends a snapshot with `trigger = "rebuild"`.

## 11. Processing a response

`submitResponse` (immediate feedback) and `submitAttempt` (deferred feedback) in
`src/modules/assessments/service.ts` run, inside one transaction:
validate → authorise (attempt belongs to the user, is open, within its time
limit) → grade → insert `question_responses` (unique per user + idempotency
key, so double submits are no-ops) → insert evidence per skill (unique per
response + skill) → update misconceptions → recalculate each touched skill →
upsert state + append snapshot + update review schedule → append
`QUESTION_SUBMITTED` / `MASTERY_RECALCULATED` events → return feedback.
