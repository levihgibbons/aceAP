# Content pipeline

`Draft → Review → Validation → Published → Revision`

## Authoring

Content is typed data in `content/courses/<courseId>.ts` (+ a `.questions.ts`
file), using `defineCourse()` from `src/modules/content/schema.ts`:

- **Skills** — id, name, description, difficulty, search keywords,
  prerequisites, labels for each problem pattern.
- **Misconceptions** — id, skill, title, description, remediation.
- **Units → topics → objectives / lessons** — lessons are ordered blocks:
  `text`, `callout`, `definition`, `formula`, `worked_example` (step reveal),
  `check` (embedded question), `simulation`, `note_prompt`, `tutor_prompt`,
  `summary`, `image`.
- **Questions** — `multiple_choice`, `multi_select`, `numeric`, `expression`,
  `ordering`, `matching`, `short_response` (teacher rubric), each with skills,
  difficulty 1–5, problem pattern, hints, worked solution, optional simulation
  stimulus, and misconception tags on distractors / common errors.
- **Assessments** — skill quiz, lesson quiz, unit test, course review, exam
  practice, custom; timing, feedback timing and assistance policy.
- **Provenance** — author, origin (`original`, `ai_assisted_original`,
  `licensed`, `teacher_contributed`), reviewer, notes.

Formats planned but not yet gradable (graph construction, DBQ/LEQ, essays,
code, audio, portfolio) are listed with an honest "planned" status in
`QUESTION_TYPE_SUPPORT`.

## Validation (`npm run content:validate`)

Deterministic checks — a course with any error is **not published**:

1. Schema (Zod) for every block, question and assessment.
2. References: unique ids, known skills/questions/misconceptions/simulations,
   acyclic prerequisite graph, every skill mapped to an objective.
3. **Answer keys through the production grader**: each key must grade correct;
   each authored common error / tagged distractor must grade incorrect *and*
   produce its tagged misconception; numeric items need a tolerance; select-all
   items can't have every option correct.
4. **KaTeX rendering** of every math fragment (balanced delimiters, no parse
   errors). Note: write currency in words — `$` is the math delimiter.
5. **Coverage**: ≥ 5 questions and ≥ 2 problem patterns per skill (otherwise a
   skill could never reach Mastered).
6. Warnings: items without hints, lessons without a check question or summary.

## Publishing (`npm run content:sync`)

Idempotent. Upserts the catalog, recomputes each course's content status,
upserts curriculum rows, and for every lesson/question compares a content hash
with the latest version: unchanged → nothing; changed → **new version row**
(`published`) plus a `content_reviews` row recording the automated checks.
Earlier versions stay, and attempts reference the exact version they served.

AI-generated or AI-assisted content enters as `ai_assisted_original` and passes
the same gate. The automated gate proves internal consistency (keys,
rendering, references); it does **not** prove pedagogical quality or
curriculum alignment, so human subject-matter review is required before school
use. Content reviews and provenance are visible at `/admin/content`.

## Licensing registry

`content/sources.ts` → `content_sources`. Every third-party resource must be
registered before it is referenced, linked, embedded or adapted, with licence,
attribution, commercial-use and modification permissions, usage and approval
status. Current entries:

| Source | Use | Status |
|---|---|---|
| College Board AP Central | alignment reference only (names, unit titles, links) | approved |
| PhET Interactive Simulations | not used — commercial licence needs review | pending |
| OpenStax textbooks | not used — licence varies by title (some NC) | pending |

Never bulk-import AP Classroom questions or proprietary textbooks.

## Adding a course

1. Create `content/courses/<id>.ts` and `<id>.questions.ts` (copy the
   structure of `calculus-ab.ts`). Use the catalog id (`content/catalog/ap-catalog.json`).
2. Register it in `content/index.ts`.
3. `npx tsx scripts/content-validate.ts content/courses/<id>.ts` until clean.
4. `npm run content:sync` (stop the dev server first when using the embedded DB).
5. Optional: add cross-course links in `content/relationships.ts`.
