/**
 * Knowledge Vault: notes, links, tags, backlinks, concept pages, graph,
 * sharing (enforced by PostgreSQL row-level security) and export.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { asUser, getDb, type Actor } from "@/db/client";
import * as t from "@/db/schema";
import { DomainError } from "@/lib/errors";
import { startAttempt, submitResponse } from "@/modules/assessments/service";
import { createUser, type SessionUser } from "@/modules/auth/service";
import { createClass, joinClassByCode } from "@/modules/classrooms/service";
import { syncContent } from "@/modules/content/sync";
import { mergeTags, parseTags, parseWikiLinks, slugify } from "@/modules/vault/links";
import {
  createNote,
  deleteNote,
  exportVault,
  getBacklinks,
  getConceptPage,
  getGraph,
  getNote,
  listNoteShares,
  listNotes,
  listSharedNotesForClass,
  listTags,
  shareNote,
  unshareNote,
  updateNote,
  validateVaultExport,
  VAULT_EXPORT_SCHEMA_VERSION,
} from "@/modules/vault/service";

const CHAIN = "calculus-ab.chain-polynomial";
const actor = (u: SessionUser): Actor => ({ id: u.id, role: u.role });

let studentA: SessionUser;
let studentB: SessionUser;
let teacher: SessionUser;
let otherTeacher: SessionUser;
let classId: string;
let otherClassId: string;

async function expectDomainError(p: Promise<unknown>, code: DomainError["code"]) {
  await expect(p).rejects.toSatisfy((e: unknown) => e instanceof DomainError && e.code === code);
}

beforeAll(async () => {
  await syncContent(await getDb());
  studentA = await createUser({ name: "Ada Student", email: "ada@vault.test", password: "correct horse battery", role: "student" });
  studentB = await createUser({ name: "Ben Student", email: "ben@vault.test", password: "correct horse battery", role: "student" });
  teacher = await createUser({ name: "Tess Teacher", email: "tess@vault.test", password: "correct horse battery", role: "teacher", createPersonalOrganization: true });
  otherTeacher = await createUser({ name: "Otto Teacher", email: "otto@vault.test", password: "correct horse battery", role: "teacher", createPersonalOrganization: true });
  const cls = await createClass(teacher, { name: "AB Calc", courseId: "calculus-ab" });
  const other = await createClass(otherTeacher, { name: "Other AB Calc", courseId: "calculus-ab" });
  classId = cls.id;
  otherClassId = other.id;
  await joinClassByCode(studentA, cls.joinCode);
  await joinClassByCode(studentB, cls.joinCode);

  // Evidence for A on the chain rule: one misconception-tagged miss, then a correct answer.
  const t0 = new Date("2026-10-01T15:00:00Z");
  const { attemptId } = await startAttempt(studentA.id, { kind: "lesson", lessonId: "calculus-ab.l.chain-rule" }, t0);
  await submitResponse(studentA.id, { attemptId, questionId: "calculus-ab.q.cp-1", response: { type: "expression", value: "3*(x^2+1)^2" }, idempotencyKey: "a-cp1-1" }, new Date(t0.getTime() + 60_000));
  await submitResponse(studentA.id, { attemptId, questionId: "calculus-ab.q.cp-1", response: { type: "expression", value: "6*x*(x^2+1)^2" }, idempotencyKey: "a-cp1-2" }, new Date(t0.getTime() + 120_000));
});

describe("link and tag parsing", () => {
  it("parses wiki links with aliases and ignores code", () => {
    const md = "See [[Chain rule: powers of functions]] and [[Glossary|my glossary]].\n`[[Inline]]`\n```\n[[Fenced]] #fenced\n```\n[[Heading link#Section]]";
    const links = parseWikiLinks(md);
    expect(links.map((l) => l.target)).toEqual(["Chain rule: powers of functions", "Glossary", "Heading link"]);
    expect(links[1].alias).toBe("my glossary");
    expect(links[0].key).toBe("chain rule: powers of functions");
  });

  it("parses #tags but not headings, code or link fragments", () => {
    expect(parseTags("# Heading\nA #Calc note #chain-rule, `#code` and [[Note#part]] #calc")).toEqual(["calc", "chain-rule", "calc"]);
    expect(mergeTags(["Physics", "#calc"], "body #calc #new")).toEqual(["physics", "calc", "new"]);
    expect(mergeTags(Array.from({ length: 30 }, (_, i) => `t${i}`), "")).toHaveLength(20);
    expect(slugify("Chain rule: powers of functions!")).toBe("chain-rule-powers-of-functions");
    expect(slugify("¿¿??")).toBe("note");
  });
});

describe("notes", () => {
  it("creates, reads, lists, searches, updates and deletes notes", async () => {
    const a = actor(studentA);
    const first = await createNote(a, { title: "  Limits   recap ", body: "Limits describe behaviour near a point.", folder: "/calc/unit1/" }, new Date("2026-10-02T10:00:00Z"));
    expect(first.title).toBe("Limits recap");
    expect(first.folder).toBe("calc/unit1");
    const second = await createNote(a, { title: "Derivative intuition", body: "Slope of the tangent line.", tags: ["Calc"] }, new Date("2026-10-02T11:00:00Z"));

    const listed = await listNotes(a, { query: "" });
    const ids = listed.map((n) => n.id);
    expect(ids.indexOf(second.id)).toBeLessThan(ids.indexOf(first.id));
    expect((await listNotes(a, { query: "TANGENT" })).map((n) => n.id)).toEqual([second.id]);
    expect((await listNotes(a, { folder: "calc" })).map((n) => n.id)).toContain(first.id);
    expect((await listNotes(a, { tag: "calc" })).map((n) => n.id)).toContain(second.id);

    await expectDomainError(createNote(a, { title: "LIMITS RECAP", body: "" }), "conflict");
    await expectDomainError(createNote(a, { title: "Too big", body: "x".repeat(100 * 1024 + 1) }), "invalid");
    await expectDomainError(createNote(a, { title: "Bad [[title]]", body: "" }), "invalid");

    const updated = await updateNote(a, first.id, { title: "Limits summary", body: "Updated body #limits" });
    expect(updated.title).toBe("Limits summary");
    expect(updated.tags).toEqual(["limits"]);
    expect((await getNote(a, first.id)).body).toBe("Updated body #limits");
    await expectDomainError(updateNote(a, first.id, { title: "derivative INTUITION" }), "conflict");

    await deleteNote(a, first.id);
    await expectDomainError(getNote(a, first.id), "not_found");
    await expectDomainError(deleteNote(a, first.id), "not_found");
  });

  it("collects tags from the body and explicit tags", async () => {
    const a = actor(studentA);
    const n = await createNote(a, { title: "Tag test", body: "Working on #Chain-Rule and #calc\n```\n#ignored\n```", tags: ["Review", "calc"] });
    expect(n.tags).toEqual(["review", "calc", "chain-rule"]);
    const tags = await listTags(a);
    expect(tags.find((x) => x.tag === "calc")?.count).toBeGreaterThanOrEqual(2);
  });
});

describe("links and backlinks", () => {
  it("resolves links to notes and skills, and later resolves unresolved links", async () => {
    const a = actor(studentA);
    const source = await createNote(a, { title: "Chain rule notes", body: "Key idea: [[Chain rule: powers of functions]] — see also [[My Glossary|glossary]] and `[[Not a link]]`." });
    const skillLink = source.links.find((l) => l.targetType === "skill");
    expect(skillLink).toMatchObject({ targetId: CHAIN, title: "Chain rule: powers of functions", href: `/app/vault/concepts/${encodeURIComponent(CHAIN)}` });
    expect(source.links.find((l) => l.targetType === "unresolved")).toMatchObject({ targetId: "my glossary", label: "glossary" });
    expect(source.links).toHaveLength(2);

    const glossary = await createNote(a, { title: "my glossary", body: "Composite: f(g(x))." });
    const reread = await getNote(a, source.id);
    expect(reread.links.find((l) => l.targetType === "unresolved")).toBeUndefined();
    expect(reread.links.find((l) => l.targetType === "note")).toMatchObject({ targetId: glossary.id, title: "my glossary", label: "glossary" });

    const noteBacklinks = await getBacklinks(a, { type: "note", id: glossary.id });
    expect(noteBacklinks.map((b) => b.noteId)).toEqual([source.id]);
    expect(noteBacklinks[0].snippet).toContain("My Glossary");

    const skillBacklinks = await getBacklinks(a, { type: "skill", id: CHAIN });
    expect(skillBacklinks.map((b) => b.noteId)).toContain(source.id);
    expect(skillBacklinks.find((b) => b.noteId === source.id)?.snippet).toContain("Chain rule: powers of functions");

    // Deleting the target turns the link back into an unresolved one.
    await deleteNote(a, glossary.id);
    expect((await getNote(a, source.id)).links.find((l) => l.targetType === "unresolved")?.targetId).toBe("my glossary");
    const again = await createNote(a, { title: "My Glossary", body: "Recreated." });
    expect((await getNote(a, source.id)).links.find((l) => l.targetType === "note")?.targetId).toBe(again.id);

    // Another student's notes never appear in A's backlinks.
    await createNote(actor(studentB), { title: "Ben's chain rule", body: "[[Chain rule: powers of functions]]" });
    const after = await getBacklinks(a, { type: "skill", id: CHAIN });
    expect(after.every((b) => b.title !== "Ben's chain rule")).toBe(true);
  });
});

describe("concept pages", () => {
  it("shows the student's own mastery, misconceptions, lessons and graph neighbours", async () => {
    const page = await getConceptPage(actor(studentA), CHAIN);
    expect(page.skill).toMatchObject({ id: CHAIN, name: "Chain rule: powers of functions", courseId: "calculus-ab", courseName: expect.any(String) });
    expect(page.mastery.started).toBe(true);
    expect(page.mastery.level).not.toBe("not_started");
    expect(page.mastery.summary.length).toBeGreaterThan(0);
    expect(page.evidenceSummary.attempts).toBe(2);
    expect(page.evidenceSummary.correct).toBe(1);
    expect(page.misconceptions.map((m) => m.title)).toContain("Omitted the derivative of the inner function");
    expect(page.misconceptions[0].remediation.length).toBeGreaterThan(0);
    expect(page.lessons).toContainEqual(expect.objectContaining({ id: "calculus-ab.l.chain-rule", href: "/app/learn/calculus-ab.l.chain-rule" }));
    expect(page.prerequisites.map((p) => p.skillId).sort()).toEqual(["calculus-ab.inner-outer", "calculus-ab.power-rule"]);
    expect(page.dependents.map((p) => p.skillId)).toContain("calculus-ab.chain-interpret");
    expect(page.backlinks.length).toBeGreaterThan(0);
    expect(page.history.length).toBeGreaterThan(0);
    expect(JSON.stringify(page)).not.toContain("6*x*(x^2+1)^2");

    const forB = await getConceptPage(actor(studentB), CHAIN);
    expect(forB.mastery).toMatchObject({ started: false, level: "not_started" });
    expect(forB.misconceptions).toEqual([]);
    expect(forB.evidenceSummary.attempts).toBe(0);
    expect(forB.backlinks.every((b) => b.title === "Ben's chain rule")).toBe(true);
  });

  it("includes cross-course relationships with their rationale", async () => {
    const page = await getConceptPage(actor(studentA), "calculus-ab.power-rule");
    const cross = page.related.filter((r) => r.crossCourse);
    expect(cross.length).toBeGreaterThan(0);
    expect(cross[0].rationale.length).toBeGreaterThan(10);
    await expectDomainError(getConceptPage(actor(studentA), "no-such-skill"), "not_found");
  });
});

describe("graph", () => {
  it("overlays the student's notes and levels on shared curriculum edges, deterministically", async () => {
    const a = actor(studentA);
    const graph = await getGraph(a);
    const notes = await listNotes(a, { limit: 200 });
    const source = notes.find((n) => n.title === "Chain rule notes")!;
    expect(graph.edges).toContainEqual(expect.objectContaining({ source: `note:${source.id}`, target: `skill:${CHAIN}`, type: "REFERENCES" }));
    expect(graph.edges).toContainEqual(expect.objectContaining({ source: "skill:calculus-ab.inner-outer", target: `skill:${CHAIN}`, type: "PREREQUISITE_OF" }));
    expect(graph.edges).toContainEqual(expect.objectContaining({ source: `skill:${CHAIN}`, target: "course:calculus-ab", type: "PART_OF" }));
    expect(graph.edges.some((e) => e.type === "MISCONCEPTION_OF" && e.target === `skill:${CHAIN}`)).toBe(true);
    const chainNode = graph.nodes.find((n) => n.id === `skill:${CHAIN}`)!;
    expect(chainNode.level).not.toBe("not_started");
    expect(graph.nodes.length).toBeLessThanOrEqual(400);

    // No other student's notes; every edge endpoint exists.
    const noteNodes = graph.nodes.filter((n) => n.type === "note");
    expect(noteNodes.every((n) => notes.some((x) => `note:${x.id}` === n.id))).toBe(true);
    expect(noteNodes.some((n) => n.label === "Ben's chain rule")).toBe(false);
    const ids = new Set(graph.nodes.map((n) => n.id));
    expect(graph.edges.every((e) => ids.has(e.source) && ids.has(e.target))).toBe(true);

    expect(await getGraph(a)).toEqual(graph);

    // Shared structure is the same for B, but B's overlay is B's own.
    const graphB = await getGraph(actor(studentB));
    expect(graphB.edges).toContainEqual(expect.objectContaining({ source: "skill:calculus-ab.inner-outer", target: `skill:${CHAIN}`, type: "PREREQUISITE_OF" }));
    expect(graphB.nodes.find((n) => n.id === `skill:${CHAIN}`)?.level).toBe("not_started");
    expect(graphB.nodes.filter((n) => n.type === "note").map((n) => n.label)).toEqual(["Ben's chain rule"]);

    const course = await getGraph(a, { courseId: "calculus-ab", includeCurriculum: false });
    expect(course.nodes.every((n) => n.type !== "skill" || n.courseId === "calculus-ab")).toBe(true);
  });
});

describe("row-level security", () => {
  it("blocks another student from reading, updating or deleting a note at the database", async () => {
    const note = await createNote(actor(studentA), { title: "Private thoughts", body: "Only for me." });
    const b = actor(studentB);

    expect(await asUser(b, (tx) => tx.select().from(t.vaultNotes).where(eq(t.vaultNotes.id, note.id)))).toEqual([]);
    expect(await asUser(b, (tx) => tx.update(t.vaultNotes).set({ title: "hacked" }).where(eq(t.vaultNotes.id, note.id)).returning())).toEqual([]);
    expect(await asUser(b, (tx) => tx.delete(t.vaultNotes).where(eq(t.vaultNotes.id, note.id)).returning())).toEqual([]);
    expect(await asUser(b, (tx) => tx.select().from(t.vaultLinks).where(eq(t.vaultLinks.userId, studentA.id)))).toEqual([]);
    await expect(asUser(b, (tx) => tx.insert(t.vaultNotes).values({ userId: studentA.id, title: "Forged", body: "" }))).rejects.toThrow();

    await expectDomainError(getNote(b, note.id), "not_found");
    await expectDomainError(updateNote(b, note.id, { body: "x" }), "not_found");
    await expectDomainError(deleteNote(b, note.id), "not_found");
    expect((await getNote(actor(studentA), note.id)).title).toBe("Private thoughts");
  });

  it("lets a teacher read a note only while it is explicitly shared with their class", async () => {
    const a = actor(studentA);
    const tch = actor(teacher);
    const note = await createNote(a, { title: "For my teacher", body: "Here is how I think about the chain rule." });
    const readAsTeacher = (who: Actor) => asUser(who, (tx) => tx.select().from(t.vaultNotes).where(eq(t.vaultNotes.id, note.id)));

    expect(await readAsTeacher(tch)).toEqual([]);
    expect(await listSharedNotesForClass(tch, classId)).toEqual([]);

    const share = await shareNote(a, note.id, classId);
    expect(share).toMatchObject({ noteId: note.id, classId, className: "AB Calc" });
    expect(await listNoteShares(a, note.id)).toEqual([expect.objectContaining({ classId, className: "AB Calc" })]);
    expect(await readAsTeacher(tch)).toHaveLength(1);
    const shared = await listSharedNotesForClass(tch, classId);
    expect(shared).toEqual([expect.objectContaining({ noteId: note.id, title: "For my teacher", body: note.body, authorName: "Ada Student" })]);

    // Reading is all a share grants; other teachers see nothing.
    expect(await asUser(tch, (tx) => tx.update(t.vaultNotes).set({ body: "edited" }).where(eq(t.vaultNotes.id, note.id)).returning())).toEqual([]);
    expect(await readAsTeacher(actor(otherTeacher))).toEqual([]);
    await expectDomainError(listSharedNotesForClass(actor(otherTeacher), classId), "not_found");

    await unshareNote(a, note.id, classId);
    expect(await readAsTeacher(tch)).toEqual([]);
    expect(await listSharedNotesForClass(tch, classId)).toEqual([]);
    await expectDomainError(unshareNote(a, note.id, classId), "not_found");
  });

  it("refuses to share to a class the student isn't in, or someone else's note", async () => {
    const note = await createNote(actor(studentA), { title: "Share attempt", body: "..." });
    await expectDomainError(shareNote(actor(studentA), note.id, otherClassId), "forbidden");
    await expectDomainError(shareNote(actor(studentB), note.id, classId), "forbidden");
    const db = await getDb();
    expect(await db.select().from(t.vaultShares).where(eq(t.vaultShares.noteId, note.id))).toEqual([]);
  });
});

describe("export", () => {
  it("exports a valid JSON document without question content or other people's data", async () => {
    const a = actor(studentA);
    await createNote(a, { title: "Rules I rely on", body: "[[Power rule]] comes before the chain rule." });
    const file = await exportVault(a, "json", new Date("2026-11-01T12:00:00Z"));
    expect(file.filename).toBe("aceap-vault-2026-11-01.json");
    expect(file.contentType).toContain("application/json");
    const doc = JSON.parse(file.body);
    const checked = validateVaultExport(doc);
    expect(checked.success).toBe(true);
    expect(validateVaultExport(file.body).success).toBe(true);
    expect(validateVaultExport({ ...doc, schema: "other" }).success).toBe(false);

    expect(doc).toMatchObject({ schema: "aceap.vault-export", schemaVersion: VAULT_EXPORT_SCHEMA_VERSION, owner: { name: "Ada Student" } });
    expect(Object.keys(doc.owner)).toEqual(["name"]);
    expect(doc.notes.some((n: { title: string }) => n.title === "Chain rule notes")).toBe(true);
    expect(doc.concepts.map((c: { skillId: string }) => c.skillId)).toContain(CHAIN);
    expect(doc.mastery.map((m: { skillId: string }) => m.skillId)).toContain(CHAIN);
    expect(doc.misconceptions.map((m: { title: string }) => m.title)).toContain("Omitted the derivative of the inner function");
    expect(doc.conceptEdges).toContainEqual({ source: "calculus-ab.power-rule", target: CHAIN, type: "PREREQUISITE_OF", rationale: null });
    expect(doc.licensing.note).toContain("Question text");

    // No question prompts, answers or solutions; no other users' data or emails.
    const db = await getDb();
    const versions = await db.select().from(t.questionVersions);
    for (const v of versions) {
      expect(file.body.includes(v.prompt)).toBe(false);
      expect(file.body.includes(v.solution)).toBe(false);
    }
    for (const s of ["6*x*(x^2+1)^2", "3*(x^2+1)^2", "Ben's chain rule", studentB.id, teacher.id, "ada@vault.test", "ben@vault.test", "tess@vault.test", "Tess Teacher"]) {
      expect(file.body.includes(s)).toBe(false);
    }
    expect(file.body.includes(studentA.id)).toBe(false);
  });

  it("exports Markdown with front matter and records every export", async () => {
    const a = actor(studentA);
    const file = await exportVault(a, "markdown", new Date("2026-11-01T12:05:00Z"));
    expect(file.filename).toBe("aceap-vault-2026-11-01.md");
    expect(file.contentType).toContain("text/markdown");
    expect(file.body).toMatch(/---\ntitle: "Chain rule notes"\ntags: \[.*\]\ncreated: \d{4}-.*\nupdated: \d{4}-.*\n---/);
    expect(file.body).toContain("## Mastery summary");
    expect(file.body).toContain("| Chain rule: powers of functions |");

    const rows = await asUser(a, (tx) => tx.select().from(t.vaultExports).where(eq(t.vaultExports.userId, studentA.id)));
    expect(rows.map((r) => r.format).sort()).toEqual(["json", "markdown"]);
    expect(rows.every((r) => r.schemaVersion === VAULT_EXPORT_SCHEMA_VERSION && r.counts.notes > 0)).toBe(true);
    expect(await asUser(actor(studentB), (tx) => tx.select().from(t.vaultExports).where(eq(t.vaultExports.userId, studentA.id)))).toEqual([]);
  });

  it("logs NOTE_CREATED events with ids and counts but no note content", async () => {
    const db = await getDb();
    const events = await db.select().from(t.learningEvents).where(and(eq(t.learningEvents.userId, studentA.id), eq(t.learningEvents.type, "NOTE_CREATED")));
    expect(events.length).toBeGreaterThan(3);
    const payloads = JSON.stringify(events.map((e) => e.payload));
    expect(payloads).not.toContain("Chain rule notes");
    expect(payloads).not.toContain("Key idea");
    expect(events.every((e) => typeof e.payload.noteId === "string" && typeof e.payload.links === "number")).toBe(true);
  });
});
