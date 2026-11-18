# Knowledge vault

Each student's personal knowledge base. It **builds itself from their
progress** — nobody has to set it up — and their own notes sit alongside it.
It is private to the student.

Code: `src/modules/vault/` (`knowledge.ts` for the self-building part,
`service.ts` for notes, links, graph and export; `links.ts` link parser).
UI: `/app/vault` (My knowledge), `/app/vault/notes`, `/app/vault/graph`,
`/app/vault/export`, `/app/vault/concepts/<skillId>`.
Tests: `tests/vault-knowledge.test.ts`, `tests/vault.test.ts`, `tests/authorization.test.ts`.

## My knowledge (built from progress)

`getKnowledgeBase(actor)` assembles, on every read and for every course the
student is in, one entry per topic they have reached:

| Part | Comes from | When it appears |
|---|---|---|
| Lessons (finished / in progress) | `lesson_progress` | when the lesson is opened |
| Key ideas, definitions, formulas | the `summary`, `definition` and `formula` blocks of the lesson version they saw | as they reach each block (`furthest_block`); everything once the lesson is finished |
| Skill levels | `mastery_states` | after their first graded answer |
| "Watch out" / "Fixed" | `detected_misconceptions` (unresolved / resolved) | when an answer pattern shows it, and when it is resolved |
| Their notes | `vault_links` from their notes to the topic's skills | when a note links `[[a skill]]` |

Nothing is copied or stored: the page is derived, so it always matches the
current record, and deleting progress or notes removes it from the vault.
Student-private rows are read under RLS (`asUser`), so only the caller's own
progress can appear. Topics and units not reached yet are counted ("still to
unlock") but not shown. "Recently added" lists the latest lessons, skill
updates and fixed misconceptions. Old `/app/vault?note=…` links redirect to
`/app/vault/notes`.

## Model

| Layer | Stored in | Shared? |
|---|---|---|
| Personal notes (Markdown, tags, folder) | `vault_notes` | private to the owner |
| Links parsed from notes (`[[Title]]`, `[[Title\|alias]]`) | `vault_links` (target: note, skill, or unresolved) | private |
| Curriculum concepts and relationships (prerequisites, part-of, cross-course related/applied-in with rationale) | `skills`, `skill_prerequisites`, `skill_relationships` | shared, stored once |
| Student overlay: mastery level, review flag, misconceptions, evidence summary, history | `mastery_states`, `detected_misconceptions`, `mastery_snapshots` | private (teachers of the student's class can read mastery, not notes) |
| Sharing | `vault_shares` (note × class) | explicit, revocable |
| Exports | `vault_exports` (metadata only) | private |

The universal relationship "derivative → velocity" is a single shared row; the
student-specific part is only their level on each node and their notes.

## Links

`[[Target]]` resolves, in order, to another note of the same owner (title,
case-insensitive), a curriculum skill by name, or stays "unresolved" and is
re-resolved when a matching note is created or renamed. `#tags` in the body
merge with explicit tags. Links inside code are ignored.

## Graph

Nodes: course, skill, note, misconception. Edges: `PART_OF`, `PREREQUISITE_OF`,
`RELATED_TO`, `APPLIED_IN`, `EXPLAINS`, `REFERENCES`, `MISCONCEPTION_OF`
(`DEMONSTRATES` is reserved for evidence nodes). Scope: courses the student is
enrolled in plus any skill their notes reference; bounded to 400 nodes and
deterministic. An accessible list view mirrors the graph.

## Export format

`GET /api/vault/export?format=json` →

```jsonc
{
  "schema": "aceap.vault-export",
  "schemaVersion": "1.0.0",
  "exportedAt": "…",
  "owner": { "name": "…" },
  "notes": [{ "id", "title", "body", "tags", "folder", "createdAt", "updatedAt", "links": [...] }],
  "concepts": [{ "skillId", "name", "courseId", "courseName" }],
  "conceptEdges": [...],          // shared edges among those concepts
  "mastery": [{ "skillId", "level", "needsReview", "estimate", "evidenceSummary", "lastDemonstratedAt", "calcVersion", "policyVersion" }],
  "masteryHistory": [...],
  "misconceptions": [{ "skillId", "title", "status", "firstObservedAt", "lastObservedAt" }],
  "courses": [...],
  "licensing": { "note": "Question text and third-party content are not included…" }
}
```

Validated by `validateVaultExport()` (Zod) — the same schema a future importer
will use. Markdown export: one document with YAML front matter per note and a
mastery summary table. Question prompts/answers, other people's data and
internal ids of other users are never included.

## Permissions

- Owner: full CRUD (enforced by RLS insert/update/delete policies).
- Teacher: reads a note only via a `vault_shares` row for a class they teach,
  while the student is actively enrolled; access ends on unshare or removal.
- Platform admin: **no** access to notes.
- Changing schools never exposes prior notes: shares are per class.

## Portability roadmap

Planned: import of `aceap.vault-export` files; OAuth-scoped API for
student-approved third-party access (read mastery summaries, read selected
notes, submit evidence through validation — never write mastery directly).
See ROADMAP.md, "Learning OS".
