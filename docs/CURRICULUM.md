# Curriculum and AP alignment

## Catalog

`content/catalog/ap-catalog.json` lists every AP course College Board currently
publishes. It was verified on **2026-11-17** against the AP Central course index
(<https://apcentral.collegeboard.org/courses>) and each course's AP Central page:
**43 courses** (42 active + AP Networking, announced for 2027–28 and shown as
"upcoming"). The file records, per course: official name, category, availability,
source URL, an original one-sentence description, and the official unit titles
(short factual names only) with `outlineVerified`. Re-verify each school year;
update the JSON and run `npm run content:sync`.

Courses with no titled units are recorded with an empty outline: the three AP Art
and Design portfolios and AP Seminar/Research (organised by big ideas) and
AP English Language and Composition (nine untitled units). Some courses use
official numbering that doesn't start at 1 (Physics 2: 9–15; Physics C: E&M: 8–13),
and AP Business with Personal Finance splits Unit 3 into two parts — the sync
assigns them distinct ids.

## Honest content status

Every course has a `content_status` computed by content sync — never set by hand:

| Status | Meaning |
|---|---|
| Catalog only | Listed; AceAP has no outline or lessons |
| Outline available | Official unit list shown; no lessons yet |
| Lessons in development | Some lessons exist but the sequence isn't ready (reserved) |
| Pilot course | A complete, assessed sequence exists for part of the course |
| Complete course | Every unit has lessons, practice and assessments (none yet) |

Outline units are labelled as such in the UI and never presented as finished
learning content.

## Hierarchy

```
Course ─ CourseVersion ─ Unit ─ Topic ─ LearningObjective ─(many:many)─ Skill
                                    └── Lesson (typed blocks) ── teaches skills
Skill ─ prerequisites (DAG) · cross-course relationships · misconceptions · questions
Question ─ versions ─ assesses one primary + optional secondary skills
Assessment ─ ordered question list + config (timing, feedback, assistance)
```

- **Course identity** (`courses.id`, e.g. `calculus-ab`) is stable across
  revisions; **course versions** (`course_versions`) carry the alignment source,
  notes and verification status. Classes record the version they use.
- **Objective codes** such as `CALC-3.B` are AceAP's own, not College Board codes.
- **Curriculum revisions**: when College Board revises a course, add a new course
  version and new objectives; record mappings in `objective_mappings`
  (`equivalent`, `partial`, `retired_unmapped`). Evidence is attached to skills
  and never moved automatically; unmapped objectives are reported, not guessed.

## Pilot sequences

| Course | Scope | Skills | Lessons | Questions | Assessments | Simulation |
|---|---|---|---|---|---|---|
| AP Calculus AB | Unit 2 core derivative rules → Unit 3 the chain rule | 9 | 5 | 56 | skill quiz, lesson quiz, unit test (chain-rule portion), exam practice set | Derivative Explorer |
| AP Microeconomics | Unit 3 production, costs, profit maximisation, shutdown | 9 | 5 | 55 | skill quiz, lesson quiz, unit test (firm portion), exam practice set | Firm Behavior Lab |
| AP Physics 1 | **Full course, all 8 units** (Kinematics; Force and Translational Dynamics; Work, Energy, and Power; Linear Momentum; Torque and Rotational Dynamics; Energy and Momentum of Rotating Systems; Oscillations; Fluids) — 51 topics, each taught by lessons and then practised in exercises, 169 tracked misconceptions | 103 | 88 | 1573 | 125 exercises, 21 quizzes, 8 unit tests, 9 AP-style practice sets | Motion Lab |

All lesson and question text is original AceAP content (AI-assisted, machine-
validated; human subject-matter review is still required before school use —
see ROADMAP.md). College Board material is used only as an alignment reference
(course names, unit titles, links). No College Board questions, learning
objectives or essential-knowledge statements are reproduced.

## Cross-course relationships

`content/relationships.ts` holds shared relationships between skills in different
courses (e.g. derivatives ↔ velocity/acceleration ↔ marginal cost and profit
maximisation), each with a rationale shown to students. They are stored once in
`skill_relationships`, not per student, and surface on vault concept pages and
in the knowledge graph.

## Adding a course

See [CONTENT_PIPELINE.md](CONTENT_PIPELINE.md). No application code changes are
needed: author `content/courses/<id>.ts`, register it in `content/index.ts`,
validate, sync.
