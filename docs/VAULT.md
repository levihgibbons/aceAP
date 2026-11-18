# Knowledge vault

Code: `src/modules/vault/` (service, link parser). UI: `/app/vault`.
Tests: `tests/vault.test.ts`, `tests/authorization.test.ts`.

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
