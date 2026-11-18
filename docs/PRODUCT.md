# Product

**One platform to learn. One system to measure mastery. One personal knowledge
record that grows with the student.**

AceAP combines structured AP learning paths, AP-style practice and assessment,
interactive simulations, an embedded AI tutor and a personal knowledge vault on
top of one evidence-based mastery record shared with teachers.

## Users

- **Students** — in a teacher's class or learning independently. One account
  spans multiple classes and courses.
- **Teachers** — create classes, assign work, read mastery evidence, grade.
- **School administrators** — staff access to their organisation's classes.
- **Platform administrators** — content review, licensing, audit, policies.

## Core flows

### Structured learning
Course → units → topics → lessons. Each lesson mixes explanation, worked
examples revealed step by step, check questions, simulations, note prompts and
tutor prompts. Status per lesson/skill: Not started, In progress, Needs review,
Proficient, Mastered. Students can jump to any topic — nothing is locked.

### On-demand learning
Global search finds lessons, skills, formulas, units, catalog courses and the
student's own notes from natural questions ("how do I find profit-maximizing
quantity?").

### Practice and assessment
Guided practice (immediate feedback, hints, retries, solutions — counted for
less), skill and lesson quizzes, unit tests (timed, feedback after submit),
mixed spaced review, AP-style exam practice sets and teacher assignments with
due dates, attempt limits, accommodations and AI policies. All produce
evidence for the same mastery record.

### Mastery
Transparent, explained levels with evidence sufficiency and diversity rules;
retention review; misconception tracking; recommendations with reasons.
See [MASTERY_ENGINE.md](MASTERY_ENGINE.md).

### Teachers
Overview → class → **mastery heatmap** (students × objectives, insufficient
evidence distinct from weak performance) → cell drill-down to the actual
attempts → targeted assignment or intervention plan. Student profiles,
engagement estimates (idle excluded), gradebook driven by a configurable
mastery-to-grade policy with preview, overrides that never alter evidence, CSV
export, Canvas integration status.

### Knowledge vault
Private Markdown notes with `[[wiki links]]` to notes and curriculum concepts,
tags, backlinks, concept pages showing the student's own mastery and
misconceptions, a knowledge graph (shared curriculum relationships + the
student's overlay, including cross-course links), scoped sharing, JSON/Markdown
export. See [VAULT.md](VAULT.md).

### AI tutor
Lesson-aware hints, explanations, examples and mistake analysis; teaches before
telling; respects teacher and assessment policies; usage recorded as
assistance; honest "not configured" state without an API key.

### AP exam preparation
Coverage, evidence per unit, weakest vs untested objectives, practice results
and consistency, review sequence — explicitly **not** a predicted AP score.

## Acceptance demonstrations

The product's definition of done (A–G) is tracked in [ROADMAP.md](ROADMAP.md).

## Demo

`npm run setup` loads a fictional world (two schools, teachers, students with
distinct learning histories). Accounts and password are printed by the seed
and listed on the sign-in page.
