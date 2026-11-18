/**
 * Knowledge Vault — a student's private, linked Markdown notes layered on the
 * shared curriculum graph.
 *
 * Access control
 *  - Every read and write of vault rows (vault_notes, vault_links,
 *    vault_shares, vault_exports) runs inside `asUser`, so PostgreSQL
 *    row-level security — not this code — guarantees that only the owner can
 *    change a note and that a teacher can read one only through an explicit
 *    vault_shares row for a class they teach.
 *  - Other student-private data used here (mastery, evidence, misconceptions)
 *    is read through `asUser` as well. Shared curriculum (skills, lessons,
 *    relationships) is identical for everyone and is read with `getDb`.
 *
 * Links
 *  - `[[Title]]` resolves to (1) another note of the same owner by title, else
 *    (2) a curriculum skill by exact name (case-insensitive), else (3) stays
 *    "unresolved" (keyed by the normalised title) and is adopted automatically
 *    when a matching note is created or renamed.
 *  - Links to a note are stored by id, so renaming the target keeps them
 *    attached; deleting it turns them back into unresolved links.
 */
import { and, asc, desc, eq, ilike, inArray, ne, or, sql } from "drizzle-orm";
import { z } from "zod";
import { asUser, getDb, type Actor, type Db } from "@/db/client";
import * as t from "@/db/schema";
import { DomainError } from "@/lib/errors";
import { logEvent } from "@/modules/learning/events";
import { LEVEL_LABEL, MASTERY_LEVELS, type MasteryLevel } from "@/modules/mastery/types";
import { cleanTitle, mergeTags, normaliseTag, normaliseTitle, parseTags, parseWikiLinks, plainExcerpt, slugify, snippetAround, uniqueWikiLinks } from "./links";

// ─────────────────────────────── constants ──────────────────────────────────

export const MAX_NOTE_BODY_BYTES = 100 * 1024;
export const MAX_NOTE_TITLE_LENGTH = 200;
export const GRAPH_MAX_NODES = 400;
const GRAPH_MAX_NOTES = 200;
const HISTORY_POINTS = 60;
const RECENT_INDEPENDENT_WINDOW = 10;
const EXPORT_MAX_SNAPSHOTS = 1000;
const CORRECT_SCORE = 0.999;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Where UI routes live; change here if the app's routes move. */
export const vaultHref = {
  note: (noteId: string) => `/app/vault/notes/${noteId}`,
  concept: (skillId: string) => `/app/vault/concepts/${encodeURIComponent(skillId)}`,
  course: (courseId: string) => `/app/courses/${encodeURIComponent(courseId)}`,
  lesson: (lessonId: string) => `/app/learn/${lessonId}`,
};

// ──────────────────────────────── types ─────────────────────────────────────

type NoteRow = typeof t.vaultNotes.$inferSelect;
export type LinkTargetType = "note" | "skill" | "unresolved";

export interface NoteLinkView {
  targetType: LinkTargetType;
  /** Note id, skill id, or the normalised title for unresolved links. */
  targetId: string;
  /** Text shown in the note (alias if given, otherwise the target as written). */
  label: string;
  /** Current title of the target note / name of the skill / the label for unresolved. */
  title: string;
  href: string | null;
}

export interface NoteView {
  id: string;
  title: string;
  slug: string;
  body: string;
  tags: string[];
  folder: string;
  createdAt: Date;
  updatedAt: Date;
  href: string;
  links: NoteLinkView[];
}

export interface NoteSummary {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  tags: string[];
  folder: string;
  createdAt: Date;
  updatedAt: Date;
  href: string;
  linkCount: number;
}

export interface Backlink {
  noteId: string;
  title: string;
  snippet: string;
  updatedAt: Date;
  href: string;
}

// ─────────────────────────────── validation ─────────────────────────────────

const titleSchema = z
  .string()
  .transform(cleanTitle)
  .pipe(
    z
      .string()
      .min(1, "Give the note a title.")
      .max(MAX_NOTE_TITLE_LENGTH, `Titles can be at most ${MAX_NOTE_TITLE_LENGTH} characters.`)
      .regex(/^[^[\]|#^]+$/, "Titles can't contain [ ] | # or ^ (they would break [[links]]).")
  );
const bodySchema = z.string().refine((s) => Buffer.byteLength(s, "utf8") <= MAX_NOTE_BODY_BYTES, "Notes can be at most 100 KB.");
const folderSchema = z
  .string()
  .transform((s) => s.trim().replace(/\\/g, "/").replace(/\/{2,}/g, "/").replace(/^\/+|\/+$/g, ""))
  .pipe(z.string().max(200, "Folder names can be at most 200 characters."));
const tagsSchema = z.array(z.string().max(60)).max(50);

export const createNoteSchema = z.object({
  title: titleSchema,
  body: bodySchema.default(""),
  tags: tagsSchema.optional(),
  folder: folderSchema.optional(),
});
export type CreateNoteInput = z.input<typeof createNoteSchema>;

export const updateNoteSchema = z.object({
  title: titleSchema.optional(),
  body: bodySchema.optional(),
  tags: tagsSchema.optional(),
  folder: folderSchema.optional(),
});
export type UpdateNoteInput = z.input<typeof updateNoteSchema>;

export const listNotesSchema = z.object({
  query: z.string().trim().max(200).optional(),
  tag: z.string().max(60).optional(),
  folder: folderSchema.optional(),
  limit: z.number().int().min(1).max(200).default(50),
});
export type ListNotesOptions = z.input<typeof listNotesSchema>;

function parse<S extends z.ZodType>(schema: S, input: unknown): z.output<S> {
  const r = schema.safeParse(input);
  if (!r.success) throw new DomainError("invalid", r.error.issues[0]?.message ?? "Invalid input.");
  return r.data;
}

function assertUuid(id: string, what: string): void {
  if (typeof id !== "string" || !UUID.test(id)) throw new DomainError("not_found", `${what} not found.`);
}

/** Find a PostgreSQL SQLSTATE on a (possibly wrapped) driver error. */
function pgCode(err: unknown): string | undefined {
  let e: unknown = err;
  for (let i = 0; i < 5 && e && typeof e === "object"; i++) {
    const code = (e as { code?: unknown }).code;
    if (typeof code === "string" && /^[0-9A-Z]{5}$/.test(code)) return code;
    e = (e as { cause?: unknown }).cause;
  }
  return undefined;
}

/** `asUser` plus translation of constraint/RLS failures into DomainErrors. */
async function vaultTx<T>(actor: Actor, fn: (tx: Db) => Promise<T>, forbiddenMessage = "You can't do that with this note."): Promise<T> {
  try {
    return await asUser(actor, fn);
  } catch (err) {
    if (err instanceof DomainError) throw err;
    const code = pgCode(err);
    if (code === "23505") throw new DomainError("conflict", "You already have a note with that title.");
    if (code === "42501" || code === "23503") throw new DomainError("forbidden", forbiddenMessage);
    throw err;
  }
}

// ──────────────────────────────── links ─────────────────────────────────────

interface ResolvedLink {
  targetType: LinkTargetType;
  targetId: string;
  label: string;
  title: string;
}

/** Resolve a body's wiki links against the owner's notes, then shared skill names. */
async function resolveLinks(tx: Db, userId: string, body: string): Promise<ResolvedLink[]> {
  const links = uniqueWikiLinks(body);
  if (links.length === 0) return [];
  const keys = links.map((l) => l.key);
  const notes = await tx
    .select({ id: t.vaultNotes.id, title: t.vaultNotes.title })
    .from(t.vaultNotes)
    .where(and(eq(t.vaultNotes.userId, userId), inArray(sql`lower(${t.vaultNotes.title})`, keys)));
  const skills = await tx
    .select({ id: t.skills.id, name: t.skills.name })
    .from(t.skills)
    .where(inArray(sql`lower(${t.skills.name})`, keys))
    .orderBy(asc(t.skills.id));

  const out: ResolvedLink[] = [];
  const seen = new Set<string>();
  for (const l of links) {
    const note = notes.find((n) => normaliseTitle(n.title) === l.key);
    const skill = note ? undefined : skills.find((s) => normaliseTitle(s.name) === l.key);
    const r: ResolvedLink = note
      ? { targetType: "note", targetId: note.id, label: l.alias ?? l.target, title: note.title }
      : skill
        ? { targetType: "skill", targetId: skill.id, label: l.alias ?? l.target, title: skill.name }
        : { targetType: "unresolved", targetId: l.key, label: l.alias ?? l.target, title: l.target };
    const k = `${r.targetType}:${r.targetId}`;
    if (!seen.has(k)) {
      seen.add(k);
      out.push(r);
    }
  }
  return out;
}

/** Replace a note's outgoing vault_links rows with the links parsed from `body`. */
async function replaceLinks(tx: Db, userId: string, noteId: string, body: string): Promise<ResolvedLink[]> {
  const resolved = await resolveLinks(tx, userId, body);
  await tx.delete(t.vaultLinks).where(eq(t.vaultLinks.noteId, noteId));
  if (resolved.length) {
    await tx.insert(t.vaultLinks).values(resolved.map((r) => ({ noteId, userId, targetType: r.targetType, targetId: r.targetId, label: r.label })));
  }
  return resolved;
}

/** Point the owner's unresolved links whose key matches `note`'s title at the note. */
async function adoptUnresolvedLinks(tx: Db, userId: string, note: { id: string; title: string }): Promise<number> {
  const key = normaliseTitle(note.title);
  const where = and(eq(t.vaultLinks.userId, userId), eq(t.vaultLinks.targetType, "unresolved"), eq(t.vaultLinks.targetId, key));
  const dangling = await tx.select().from(t.vaultLinks).where(where);
  if (dangling.length === 0) return 0;
  await tx.delete(t.vaultLinks).where(where);
  await tx
    .insert(t.vaultLinks)
    .values(dangling.map((l) => ({ noteId: l.noteId, userId, targetType: "note" as const, targetId: note.id, label: l.label })))
    .onConflictDoNothing();
  return dangling.length;
}

/** Attach current titles/names and hrefs to stored links. */
async function describeLinks(tx: Db, links: { targetType: LinkTargetType; targetId: string; label: string }[]): Promise<NoteLinkView[]> {
  const noteIds = links.filter((l) => l.targetType === "note").map((l) => l.targetId);
  const skillIds = links.filter((l) => l.targetType === "skill").map((l) => l.targetId);
  const notes = noteIds.length ? await tx.select({ id: t.vaultNotes.id, title: t.vaultNotes.title }).from(t.vaultNotes).where(inArray(t.vaultNotes.id, noteIds)) : [];
  const skills = skillIds.length ? await tx.select({ id: t.skills.id, name: t.skills.name }).from(t.skills).where(inArray(t.skills.id, skillIds)) : [];
  return links.map((l) => {
    if (l.targetType === "note") {
      const n = notes.find((x) => x.id === l.targetId);
      return { ...l, title: n?.title ?? l.label, href: n ? vaultHref.note(n.id) : null };
    }
    if (l.targetType === "skill") {
      const s = skills.find((x) => x.id === l.targetId);
      return { ...l, title: s?.name ?? l.label, href: vaultHref.concept(l.targetId) };
    }
    return { ...l, title: l.label, href: null };
  });
}

function toNoteView(note: NoteRow, links: NoteLinkView[]): NoteView {
  return {
    id: note.id,
    title: note.title,
    slug: slugify(note.title),
    body: note.body,
    tags: note.tags,
    folder: note.folder,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
    href: vaultHref.note(note.id),
    links,
  };
}

async function assertTitleAvailable(tx: Db, userId: string, title: string, exceptId?: string): Promise<void> {
  const [clash] = await tx
    .select({ id: t.vaultNotes.id })
    .from(t.vaultNotes)
    .where(and(eq(t.vaultNotes.userId, userId), sql`lower(${t.vaultNotes.title}) = ${title.toLowerCase()}`, exceptId ? ne(t.vaultNotes.id, exceptId) : undefined))
    .limit(1);
  if (clash) throw new DomainError("conflict", "You already have a note with that title.");
}

async function loadOwnNote(tx: Db, userId: string, noteId: string): Promise<NoteRow> {
  const [note] = await tx.select().from(t.vaultNotes).where(and(eq(t.vaultNotes.id, noteId), eq(t.vaultNotes.userId, userId)));
  if (!note) throw new DomainError("not_found", "Note not found.");
  return note;
}

const linkCounts = (links: ResolvedLink[]) => ({
  links: links.length,
  noteLinks: links.filter((l) => l.targetType === "note").length,
  skillLinks: links.filter((l) => l.targetType === "skill").length,
  unresolvedLinks: links.filter((l) => l.targetType === "unresolved").length,
});

// ────────────────────────────────── CRUD ────────────────────────────────────

/** Create a note owned by `actor`. Titles are unique per owner (case-insensitive). */
export async function createNote(actor: Actor, input: CreateNoteInput, now: Date = new Date()): Promise<NoteView> {
  const data = parse(createNoteSchema, input);
  const tags = mergeTags(data.tags ?? [], data.body);
  const { note, links, adopted } = await vaultTx(actor, async (tx) => {
    await assertTitleAvailable(tx, actor.id, data.title);
    const [row] = await tx
      .insert(t.vaultNotes)
      .values({ userId: actor.id, title: data.title, body: data.body, tags, folder: data.folder ?? "", createdAt: now, updatedAt: now })
      .returning();
    const resolved = await replaceLinks(tx, actor.id, row.id, row.body);
    return { note: row, links: resolved, adopted: await adoptUnresolvedLinks(tx, actor.id, row) };
  });
  // Ids and counts only — note content never goes into analytics.
  await logEvent(await getDb(), {
    userId: actor.id,
    type: "NOTE_CREATED",
    activityType: "vault_note",
    activityId: note.id,
    payload: { noteId: note.id, ...linkCounts(links), inboundLinksResolved: adopted },
    occurredAt: now,
  });
  return toNoteView(
    note,
    links.map((l) => ({ ...l, href: l.targetType === "note" ? vaultHref.note(l.targetId) : l.targetType === "skill" ? vaultHref.concept(l.targetId) : null })),
  );
}

/** Update title/body/tags/folder. Links are re-parsed when the body changes. */
export async function updateNote(actor: Actor, noteId: string, patch: UpdateNoteInput, now: Date = new Date()): Promise<NoteView> {
  assertUuid(noteId, "Note");
  const data = parse(updateNoteSchema, patch);
  return vaultTx(actor, async (tx) => {
    const existing = await loadOwnNote(tx, actor.id, noteId);
    const title = data.title ?? existing.title;
    const body = data.body ?? existing.body;
    const titleChanged = title !== existing.title;
    const bodyChanged = body !== existing.body;
    if (titleChanged && title.toLowerCase() !== existing.title.toLowerCase()) await assertTitleAvailable(tx, actor.id, title, noteId);

    // Stored tags are explicit ∪ body tags; recover the explicit part when only the body changes.
    const oldBodyTags = new Set(parseTags(existing.body));
    const explicit = data.tags ?? existing.tags.filter((tag) => !oldBodyTags.has(tag));
    const tags = data.tags !== undefined || bodyChanged ? mergeTags(explicit, body) : existing.tags;

    const [row] = await tx
      .update(t.vaultNotes)
      .set({ title, body, tags, folder: data.folder ?? existing.folder, updatedAt: now })
      .where(and(eq(t.vaultNotes.id, noteId), eq(t.vaultNotes.userId, actor.id)))
      .returning();
    if (!row) throw new DomainError("not_found", "Note not found.");
    if (bodyChanged) await replaceLinks(tx, actor.id, noteId, body);
    if (titleChanged) await adoptUnresolvedLinks(tx, actor.id, row);
    const links = await tx.select().from(t.vaultLinks).where(eq(t.vaultLinks.noteId, noteId)).orderBy(asc(t.vaultLinks.label));
    return toNoteView(row, await describeLinks(tx, links));
  });
}

/** Delete a note. Other notes' links to it become unresolved (and re-resolve if it is recreated). */
export async function deleteNote(actor: Actor, noteId: string): Promise<{ deleted: true }> {
  assertUuid(noteId, "Note");
  return vaultTx(actor, async (tx) => {
    const note = await loadOwnNote(tx, actor.id, noteId);
    const inbound = await tx
      .select()
      .from(t.vaultLinks)
      .where(and(eq(t.vaultLinks.userId, actor.id), eq(t.vaultLinks.targetType, "note"), eq(t.vaultLinks.targetId, noteId), ne(t.vaultLinks.noteId, noteId)));
    const [gone] = await tx
      .delete(t.vaultNotes)
      .where(and(eq(t.vaultNotes.id, noteId), eq(t.vaultNotes.userId, actor.id)))
      .returning({ id: t.vaultNotes.id });
    if (!gone) throw new DomainError("not_found", "Note not found.");
    if (inbound.length) {
      await tx.delete(t.vaultLinks).where(and(eq(t.vaultLinks.userId, actor.id), eq(t.vaultLinks.targetType, "note"), eq(t.vaultLinks.targetId, noteId)));
      const key = normaliseTitle(note.title);
      await tx
        .insert(t.vaultLinks)
        .values(inbound.map((l) => ({ noteId: l.noteId, userId: actor.id, targetType: "unresolved" as const, targetId: key, label: l.label })))
        .onConflictDoNothing();
    }
    return { deleted: true as const };
  });
}

/** One of the actor's own notes with its resolved outgoing links. */
export async function getNote(actor: Actor, noteId: string): Promise<NoteView> {
  assertUuid(noteId, "Note");
  return vaultTx(actor, async (tx) => {
    const note = await loadOwnNote(tx, actor.id, noteId);
    const links = await tx.select().from(t.vaultLinks).where(eq(t.vaultLinks.noteId, noteId)).orderBy(asc(t.vaultLinks.label));
    return toNoteView(note, await describeLinks(tx, links));
  });
}

const likePattern = (q: string) => `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

/** The actor's notes, most recently updated first. `query` matches title or body (case-insensitive). */
export async function listNotes(actor: Actor, options: ListNotesOptions = {}): Promise<NoteSummary[]> {
  const o = parse(listNotesSchema, options);
  const tag = o.tag !== undefined ? normaliseTag(o.tag) : undefined;
  if (o.tag !== undefined && !tag) return [];
  return vaultTx(actor, async (tx) => {
    const rows = await tx
      .select()
      .from(t.vaultNotes)
      .where(
        and(
          eq(t.vaultNotes.userId, actor.id),
          o.query ? or(ilike(t.vaultNotes.title, likePattern(o.query)), ilike(t.vaultNotes.body, likePattern(o.query))) : undefined,
          tag ? sql`${t.vaultNotes.tags} @> ${JSON.stringify([tag])}::jsonb` : undefined,
          o.folder !== undefined ? (o.folder === "" ? eq(t.vaultNotes.folder, "") : or(eq(t.vaultNotes.folder, o.folder), ilike(t.vaultNotes.folder, `${o.folder.replace(/[\\%_]/g, (c) => `\\${c}`)}/%`))) : undefined,
        ),
      )
      .orderBy(desc(t.vaultNotes.updatedAt), desc(t.vaultNotes.createdAt), asc(t.vaultNotes.id))
      .limit(o.limit);
    const ids = rows.map((r) => r.id);
    const counts = ids.length
      ? await tx.select({ noteId: t.vaultLinks.noteId, n: sql<number>`count(*)::int` }).from(t.vaultLinks).where(inArray(t.vaultLinks.noteId, ids)).groupBy(t.vaultLinks.noteId)
      : [];
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      slug: slugify(r.title),
      excerpt: plainExcerpt(r.body),
      tags: r.tags,
      folder: r.folder,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      href: vaultHref.note(r.id),
      linkCount: counts.find((c) => c.noteId === r.id)?.n ?? 0,
    }));
  });
}

/** Every tag the actor uses, most used first. */
export async function listTags(actor: Actor): Promise<{ tag: string; count: number }[]> {
  const rows = await vaultTx(actor, (tx) => tx.select({ tags: t.vaultNotes.tags }).from(t.vaultNotes).where(eq(t.vaultNotes.userId, actor.id)));
  const counts = new Map<string, number>();
  for (const r of rows) for (const tag of r.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  return [...counts].map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

// ─────────────────────────────── backlinks ──────────────────────────────────

async function backlinksFor(tx: Db, userId: string, target: { type: "note" | "skill"; id: string }, targetTitle: string): Promise<Backlink[]> {
  const rows = await tx
    .select({ noteId: t.vaultNotes.id, title: t.vaultNotes.title, body: t.vaultNotes.body, updatedAt: t.vaultNotes.updatedAt, label: t.vaultLinks.label })
    .from(t.vaultLinks)
    .innerJoin(t.vaultNotes, eq(t.vaultNotes.id, t.vaultLinks.noteId))
    .where(and(eq(t.vaultLinks.userId, userId), eq(t.vaultNotes.userId, userId), eq(t.vaultLinks.targetType, target.type), eq(t.vaultLinks.targetId, target.id)))
    .orderBy(desc(t.vaultNotes.updatedAt), asc(t.vaultNotes.id));
  const key = normaliseTitle(targetTitle);
  return rows.map((r) => {
    const links = parseWikiLinks(r.body);
    const labelKey = normaliseTitle(r.label);
    const hit = links.find((l) => l.key === key) ?? links.find((l) => normaliseTitle(l.alias ?? l.target) === labelKey);
    return {
      noteId: r.noteId,
      title: r.title,
      snippet: hit ? snippetAround(r.body, hit.index, hit.length) : plainExcerpt(r.body, 140),
      updatedAt: r.updatedAt,
      href: vaultHref.note(r.noteId),
    };
  });
}

/** The actor's notes that link to a note of theirs or to a curriculum skill, with context snippets. */
export async function getBacklinks(actor: Actor, target: { type: "note" | "skill"; id: string }): Promise<Backlink[]> {
  if (target.type === "note") {
    assertUuid(target.id, "Note");
    return vaultTx(actor, async (tx) => {
      const note = await loadOwnNote(tx, actor.id, target.id);
      return backlinksFor(tx, actor.id, target, note.title);
    });
  }
  const db = await getDb();
  const [skill] = await db.select({ name: t.skills.name }).from(t.skills).where(eq(t.skills.id, String(target.id)));
  if (!skill) throw new DomainError("not_found", "Concept not found.");
  return vaultTx(actor, (tx) => backlinksFor(tx, actor.id, { type: "skill", id: target.id }, skill.name));
}

// ───────────────────────────── concept pages ────────────────────────────────

export interface SkillRef {
  skillId: string;
  name: string;
  courseId: string;
  courseName: string;
  level: MasteryLevel;
  levelLabel: string;
  href: string;
}

export interface ConceptPage {
  skill: { id: string; name: string; description: string; courseId: string; courseName: string; href: string };
  mastery: {
    level: MasteryLevel;
    levelLabel: string;
    started: boolean;
    needsReview: boolean;
    /** Evidence estimate 0..1 (not a validated probability); null if not started. */
    estimate: number | null;
    summary: string;
    nextLevel: MasteryLevel | null;
    unmet: string[];
    lastEvidenceAt: Date | null;
  };
  evidenceSummary: {
    attempts: number;
    correct: number;
    independentAttempts: number;
    independentCorrect: number;
    assistedAttempts: number;
    lastDemonstratedAt: Date | null;
    /** Share of the last `recentWindow` unassisted first tries answered correctly; null if none. */
    recentIndependentAccuracy: number | null;
    recentWindow: number;
  };
  misconceptions: {
    id: string;
    misconceptionId: string;
    title: string;
    description: string;
    remediation: string;
    status: t.MisconceptionStatus;
    occurrences: number;
    firstObservedAt: Date;
    lastObservedAt: Date;
  }[];
  lessons: { id: string; title: string; summary: string; courseId: string; href: string }[];
  prerequisites: SkillRef[];
  dependents: SkillRef[];
  related: (SkillRef & { type: t.SkillRelationType; direction: "outgoing" | "incoming"; rationale: string; crossCourse: boolean })[];
  backlinks: Backlink[];
  history: { at: Date; estimate: number; level: MasteryLevel }[];
}

/** Shared curriculum facts about a set of skills: names and course names. */
async function skillDirectory(db: Db, skillIds: string[]): Promise<Map<string, { id: string; name: string; courseId: string; courseName: string }>> {
  if (skillIds.length === 0) return new Map();
  const rows = await db
    .select({ id: t.skills.id, name: t.skills.name, courseId: t.skills.courseId, courseName: t.courses.name })
    .from(t.skills)
    .innerJoin(t.courses, eq(t.courses.id, t.skills.courseId))
    .where(inArray(t.skills.id, [...new Set(skillIds)]));
  return new Map(rows.map((r) => [r.id, r]));
}

const isIndependent = (e: { tryNumber: number; hintsUsed: number; solutionViewed: boolean; tutorUsed: boolean }) => e.tryNumber === 1 && e.hintsUsed === 0 && !e.solutionViewed && !e.tutorUsed;

/** Everything a concept (skill) page shows for the actor — their own records only. */
export async function getConceptPage(actor: Actor, skillId: string): Promise<ConceptPage> {
  if (typeof skillId !== "string" || skillId.length > 200) throw new DomainError("not_found", "Concept not found.");
  const db = await getDb();
  const [skill] = await db
    .select({ s: t.skills, courseName: t.courses.name })
    .from(t.skills)
    .innerJoin(t.courses, eq(t.courses.id, t.skills.courseId))
    .where(eq(t.skills.id, skillId));
  if (!skill) throw new DomainError("not_found", "Concept not found.");

  // Shared curriculum around the skill.
  const [prereqRows, dependentRows, relRows, lessonRows, catalog] = await Promise.all([
    db.select().from(t.skillPrerequisites).where(eq(t.skillPrerequisites.skillId, skillId)),
    db.select().from(t.skillPrerequisites).where(eq(t.skillPrerequisites.prerequisiteSkillId, skillId)),
    db.select().from(t.skillRelationships).where(or(eq(t.skillRelationships.fromSkillId, skillId), eq(t.skillRelationships.toSkillId, skillId))),
    db
      .select({ id: t.lessons.id, title: t.lessons.title, summary: t.lessons.summary, courseId: t.lessons.courseId })
      .from(t.lessonSkills)
      .innerJoin(t.lessons, eq(t.lessons.id, t.lessonSkills.lessonId))
      .where(and(eq(t.lessonSkills.skillId, skillId), sql`${t.lessons.publishedVersion} is not null`))
      .orderBy(asc(t.lessons.ordinal), asc(t.lessons.id)),
    db.select().from(t.misconceptions).where(eq(t.misconceptions.skillId, skillId)),
  ]);
  const neighbourIds = [
    ...prereqRows.map((p) => p.prerequisiteSkillId),
    ...dependentRows.map((d) => d.skillId),
    ...relRows.map((r) => (r.fromSkillId === skillId ? r.toSkillId : r.fromSkillId)),
  ];
  const dir = await skillDirectory(db, neighbourIds);

  // The student's own records (RLS-scoped).
  const own = await asUser(actor, async (tx) => {
    const [state] = await tx.select().from(t.masteryStates).where(and(eq(t.masteryStates.userId, actor.id), eq(t.masteryStates.skillId, skillId)));
    const evidence = await tx
      .select({ score: t.masteryEvidence.score, tryNumber: t.masteryEvidence.tryNumber, hintsUsed: t.masteryEvidence.hintsUsed, solutionViewed: t.masteryEvidence.solutionViewed, tutorUsed: t.masteryEvidence.tutorUsed, occurredAt: t.masteryEvidence.occurredAt })
      .from(t.masteryEvidence)
      .where(and(eq(t.masteryEvidence.userId, actor.id), eq(t.masteryEvidence.skillId, skillId)))
      .orderBy(desc(t.masteryEvidence.occurredAt));
    const snapshots = await tx
      .select({ at: t.masterySnapshots.createdAt, estimate: t.masterySnapshots.estimate, level: t.masterySnapshots.level })
      .from(t.masterySnapshots)
      .where(and(eq(t.masterySnapshots.userId, actor.id), eq(t.masterySnapshots.skillId, skillId)))
      .orderBy(desc(t.masterySnapshots.createdAt))
      .limit(HISTORY_POINTS);
    const detected = await tx.select().from(t.detectedMisconceptions).where(and(eq(t.detectedMisconceptions.userId, actor.id), eq(t.detectedMisconceptions.skillId, skillId)));
    const neighbourStates = neighbourIds.length
      ? await tx.select({ skillId: t.masteryStates.skillId, level: t.masteryStates.level }).from(t.masteryStates).where(and(eq(t.masteryStates.userId, actor.id), inArray(t.masteryStates.skillId, neighbourIds)))
      : [];
    const backlinks = await backlinksFor(tx, actor.id, { type: "skill", id: skillId }, skill.s.name);
    return { state, evidence, snapshots, detected, neighbourStates, backlinks };
  });

  const levelOf = (id: string): MasteryLevel => own.neighbourStates.find((s) => s.skillId === id)?.level ?? "not_started";
  const ref = (id: string): SkillRef | null => {
    const s = dir.get(id);
    if (!s) return null;
    const level = levelOf(id);
    return { skillId: id, name: s.name, courseId: s.courseId, courseName: s.courseName, level, levelLabel: LEVEL_LABEL[level], href: vaultHref.concept(id) };
  };
  const byName = (a: SkillRef, b: SkillRef) => a.courseId.localeCompare(b.courseId) || a.name.localeCompare(b.name);

  const independent = own.evidence.filter(isIndependent);
  const recent = independent.slice(0, RECENT_INDEPENDENT_WINDOW);
  const state = own.state;
  const level: MasteryLevel = state?.level ?? "not_started";

  return {
    skill: { id: skill.s.id, name: skill.s.name, description: skill.s.description, courseId: skill.s.courseId, courseName: skill.courseName, href: vaultHref.concept(skill.s.id) },
    mastery: {
      level,
      levelLabel: LEVEL_LABEL[level],
      started: Boolean(state),
      needsReview: state?.needsReview ?? false,
      estimate: state?.estimate ?? null,
      summary: state?.explanation.summary ?? "You haven't answered any questions on this skill yet.",
      nextLevel: state?.explanation.nextLevel ?? null,
      unmet: state?.explanation.unmet ?? [],
      lastEvidenceAt: state?.lastEvidenceAt ?? null,
    },
    evidenceSummary: {
      attempts: own.evidence.length,
      correct: own.evidence.filter((e) => e.score >= CORRECT_SCORE).length,
      independentAttempts: independent.length,
      independentCorrect: independent.filter((e) => e.score >= CORRECT_SCORE).length,
      assistedAttempts: own.evidence.length - independent.length,
      lastDemonstratedAt: state?.lastDemonstratedAt ?? null,
      recentIndependentAccuracy: recent.length ? recent.filter((e) => e.score >= CORRECT_SCORE).length / recent.length : null,
      recentWindow: RECENT_INDEPENDENT_WINDOW,
    },
    misconceptions: own.detected
      .map((d) => {
        const m = catalog.find((c) => c.id === d.misconceptionId);
        return m
          ? { id: d.id, misconceptionId: m.id, title: m.title, description: m.description, remediation: m.remediation, status: d.status, occurrences: d.occurrences, firstObservedAt: d.firstObservedAt, lastObservedAt: d.lastObservedAt }
          : null;
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => b.lastObservedAt.getTime() - a.lastObservedAt.getTime()),
    lessons: lessonRows.map((l) => ({ ...l, href: vaultHref.lesson(l.id) })),
    prerequisites: prereqRows.map((p) => ref(p.prerequisiteSkillId)).filter((x): x is SkillRef => x !== null).sort(byName),
    dependents: dependentRows.map((d) => ref(d.skillId)).filter((x): x is SkillRef => x !== null).sort(byName),
    related: relRows
      .map((r) => {
        const outgoing = r.fromSkillId === skillId;
        const base = ref(outgoing ? r.toSkillId : r.fromSkillId);
        return base ? { ...base, type: r.type, direction: outgoing ? ("outgoing" as const) : ("incoming" as const), rationale: r.rationale, crossCourse: base.courseId !== skill.s.courseId } : null;
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort(byName),
    backlinks: own.backlinks,
    history: own.snapshots.reverse(),
  };
}

// ──────────────────────────────── graph ─────────────────────────────────────

export type GraphNodeType = "note" | "skill" | "course" | "misconception";
export type GraphEdgeType = "REFERENCES" | "PREREQUISITE_OF" | "PART_OF" | "RELATED_TO" | "APPLIED_IN" | "EXPLAINS" | "DEMONSTRATES" | "MISCONCEPTION_OF";

export interface GraphNode {
  /** Prefixed, globally unique: "note:<uuid>", "skill:<id>", "course:<id>", "misconception:<id>". */
  id: string;
  type: GraphNodeType;
  label: string;
  courseId?: string;
  level?: MasteryLevel;
  needsReview?: boolean;
  href: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: GraphEdgeType;
  label?: string;
  /** Shared explanation for cross-skill relationships (RELATED_TO / APPLIED_IN / EXPLAINS). */
  rationale?: string;
}

export interface VaultGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  /** True when the node cap (GRAPH_MAX_NODES) dropped lower-priority nodes. */
  truncated: boolean;
  scope: { courseIds: string[]; includeCurriculum: boolean };
}

const graphOptionsSchema = z.object({ courseId: z.string().min(1).max(100).optional(), includeCurriculum: z.boolean().default(true) });
const NODE_ORDER: Record<GraphNodeType, number> = { course: 0, skill: 1, misconception: 2, note: 3 };
const EDGE_LABEL: Record<GraphEdgeType, string> = {
  REFERENCES: "references",
  PREREQUISITE_OF: "prerequisite of",
  PART_OF: "part of",
  RELATED_TO: "related to",
  APPLIED_IN: "applied in",
  EXPLAINS: "explains",
  DEMONSTRATES: "demonstrates",
  MISCONCEPTION_OF: "misconception about",
};

/**
 * The student's knowledge graph: shared curriculum structure (drawn once from
 * shared tables) with a per-student overlay — mastery level on skill nodes,
 * the student's notes and their REFERENCES edges, and open misconceptions.
 *
 * Scope: skills of the courses the student is enrolled in (or `courseId`)
 * plus skills their notes reference, one hop of cross-course relationships,
 * bounded to GRAPH_MAX_NODES. Output order is deterministic.
 * DEMONSTRATES is reserved for future evidence edges and is not emitted yet.
 */
export async function getGraph(actor: Actor, options: { courseId?: string; includeCurriculum?: boolean } = {}): Promise<VaultGraph> {
  const opts = parse(graphOptionsSchema, options);
  const db = await getDb();

  const own = await asUser(actor, async (tx) => {
    const notes = await tx
      .select({ id: t.vaultNotes.id, title: t.vaultNotes.title })
      .from(t.vaultNotes)
      .where(eq(t.vaultNotes.userId, actor.id))
      .orderBy(desc(t.vaultNotes.updatedAt), asc(t.vaultNotes.id))
      .limit(GRAPH_MAX_NOTES);
    const links = notes.length
      ? await tx.select().from(t.vaultLinks).where(and(eq(t.vaultLinks.userId, actor.id), inArray(t.vaultLinks.noteId, notes.map((n) => n.id))))
      : [];
    const states = await tx.select({ skillId: t.masteryStates.skillId, level: t.masteryStates.level, needsReview: t.masteryStates.needsReview }).from(t.masteryStates).where(eq(t.masteryStates.userId, actor.id));
    const detected = await tx
      .select({ skillId: t.detectedMisconceptions.skillId, misconceptionId: t.detectedMisconceptions.misconceptionId, status: t.detectedMisconceptions.status })
      .from(t.detectedMisconceptions)
      .where(and(eq(t.detectedMisconceptions.userId, actor.id), ne(t.detectedMisconceptions.status, "resolved")));
    const viaClass = await tx
      .select({ courseId: t.classes.courseId })
      .from(t.classEnrollments)
      .innerJoin(t.classes, eq(t.classes.id, t.classEnrollments.classId))
      .where(and(eq(t.classEnrollments.studentId, actor.id), eq(t.classEnrollments.status, "active"), sql`${t.classes.archivedAt} is null`));
    const independent = await tx.select({ courseId: t.courseEnrollments.courseId }).from(t.courseEnrollments).where(eq(t.courseEnrollments.userId, actor.id));
    return { notes, links, states, detected, enrolled: [...new Set([...viaClass, ...independent].map((r) => r.courseId))].sort() };
  });

  const courseIds = opts.courseId ? [opts.courseId] : own.enrolled;
  const referencedIds = [...new Set(own.links.filter((l) => l.targetType === "skill").map((l) => l.targetId))];

  const [courseSkills, referencedSkills] = await Promise.all([
    opts.includeCurriculum && courseIds.length
      ? db.select({ id: t.skills.id, name: t.skills.name, courseId: t.skills.courseId }).from(t.skills).where(inArray(t.skills.courseId, courseIds)).orderBy(asc(t.skills.courseId), asc(t.skills.ordinal), asc(t.skills.id))
      : Promise.resolve([]),
    referencedIds.length ? db.select({ id: t.skills.id, name: t.skills.name, courseId: t.skills.courseId }).from(t.skills).where(inArray(t.skills.id, referencedIds)).orderBy(asc(t.skills.courseId), asc(t.skills.id)) : Promise.resolve([]),
  ]);
  const scopedReferenced = opts.courseId ? referencedSkills.filter((s) => s.courseId === opts.courseId) : referencedSkills;
  const coreSkillIds = new Set([...scopedReferenced, ...courseSkills].map((s) => s.id));

  // Notes in scope: all (bounded) — or, for one course, notes touching its skills plus their note neighbours.
  let noteIds = own.notes.map((n) => n.id);
  if (opts.courseId) {
    const touching = new Set(own.links.filter((l) => l.targetType === "skill" && coreSkillIds.has(l.targetId)).map((l) => l.noteId));
    for (const l of own.links) {
      if (l.targetType !== "note") continue;
      if (touching.has(l.noteId)) touching.add(l.targetId);
      else if (touching.has(l.targetId)) touching.add(l.noteId);
    }
    noteIds = noteIds.filter((id) => touching.has(id));
  }

  // Shared edges among / around the core skills.
  const core = [...coreSkillIds];
  const [prereqs, relations] = core.length
    ? await Promise.all([
        db.select().from(t.skillPrerequisites).where(inArray(t.skillPrerequisites.skillId, core)),
        db.select().from(t.skillRelationships).where(or(inArray(t.skillRelationships.fromSkillId, core), inArray(t.skillRelationships.toSkillId, core))),
      ])
    : [[], []];
  const neighbourIds = opts.includeCurriculum ? [...new Set(relations.flatMap((r) => [r.fromSkillId, r.toSkillId]).filter((id) => !coreSkillIds.has(id)))] : [];
  const neighbours = neighbourIds.length
    ? await db.select({ id: t.skills.id, name: t.skills.name, courseId: t.skills.courseId }).from(t.skills).where(inArray(t.skills.id, neighbourIds)).orderBy(asc(t.skills.courseId), asc(t.skills.id))
    : [];
  const misconceptionIds = [...new Set(own.detected.filter((d) => coreSkillIds.has(d.skillId)).map((d) => d.misconceptionId))];
  const misconceptionRows = misconceptionIds.length ? await db.select({ id: t.misconceptions.id, title: t.misconceptions.title, skillId: t.misconceptions.skillId }).from(t.misconceptions).where(inArray(t.misconceptions.id, misconceptionIds)).orderBy(asc(t.misconceptions.id)) : [];
  const allSkills = [...scopedReferenced, ...courseSkills, ...neighbours];
  const courseRows = allSkills.length
    ? await db.select({ id: t.courses.id, name: t.courses.name }).from(t.courses).where(inArray(t.courses.id, [...new Set(allSkills.map((s) => s.courseId))])).orderBy(asc(t.courses.id))
    : [];

  // Build nodes in priority order, then cap.
  const stateOf = new Map(own.states.map((s) => [s.skillId, s]));
  const skillNode = (s: { id: string; name: string; courseId: string }): GraphNode => {
    const st = stateOf.get(s.id);
    return { id: `skill:${s.id}`, type: "skill", label: s.name, courseId: s.courseId, level: st?.level ?? "not_started", needsReview: st?.needsReview ?? false, href: vaultHref.concept(s.id) };
  };
  const noteTitle = new Map(own.notes.map((n) => [n.id, n.title]));
  const buckets: GraphNode[][] = [
    courseRows.map((c) => ({ id: `course:${c.id}`, type: "course", label: c.name, courseId: c.id, href: vaultHref.course(c.id) })),
    scopedReferenced.map(skillNode),
    noteIds.map((id) => ({ id: `note:${id}`, type: "note", label: noteTitle.get(id) ?? "", href: vaultHref.note(id) })),
    courseSkills.map(skillNode),
    misconceptionRows.map((m) => ({ id: `misconception:${m.id}`, type: "misconception", label: m.title, courseId: allSkills.find((s) => s.id === m.skillId)?.courseId, href: `${vaultHref.concept(m.skillId)}#misconceptions` })),
    neighbours.map(skillNode),
  ];
  const nodes = new Map<string, GraphNode>();
  let truncated = false;
  for (const bucket of buckets) {
    for (const n of bucket) {
      if (nodes.has(n.id)) continue;
      if (nodes.size >= GRAPH_MAX_NODES) {
        truncated = true;
        break;
      }
      nodes.set(n.id, n);
    }
  }

  const edges: GraphEdge[] = [];
  const add = (e: GraphEdge) => {
    if (nodes.has(e.source) && nodes.has(e.target)) edges.push(e);
  };
  for (const s of allSkills) add({ source: `skill:${s.id}`, target: `course:${s.courseId}`, type: "PART_OF", label: EDGE_LABEL.PART_OF });
  for (const p of prereqs) add({ source: `skill:${p.prerequisiteSkillId}`, target: `skill:${p.skillId}`, type: "PREREQUISITE_OF", label: EDGE_LABEL.PREREQUISITE_OF });
  for (const r of relations) add({ source: `skill:${r.fromSkillId}`, target: `skill:${r.toSkillId}`, type: r.type, label: EDGE_LABEL[r.type], rationale: r.rationale });
  for (const l of own.links) {
    if (l.targetType === "unresolved") continue;
    add({ source: `note:${l.noteId}`, target: `${l.targetType}:${l.targetId}`, type: "REFERENCES", label: l.label });
  }
  for (const d of own.detected) add({ source: `misconception:${d.misconceptionId}`, target: `skill:${d.skillId}`, type: "MISCONCEPTION_OF", label: d.status });

  const uniqueEdges = [...new Map(edges.map((e) => [`${e.source}|${e.target}|${e.type}`, e])).values()].sort(
    (a, b) => a.source.localeCompare(b.source) || a.target.localeCompare(b.target) || a.type.localeCompare(b.type),
  );
  const sortedNodes = [...nodes.values()].sort((a, b) => NODE_ORDER[a.type] - NODE_ORDER[b.type] || (a.courseId ?? "").localeCompare(b.courseId ?? "") || a.label.localeCompare(b.label) || a.id.localeCompare(b.id));
  return { nodes: sortedNodes, edges: uniqueEdges, truncated, scope: { courseIds, includeCurriculum: opts.includeCurriculum } };
}

// ──────────────────────────────── sharing ───────────────────────────────────

export interface NoteShare {
  noteId: string;
  classId: string;
  className: string;
  sharedAt: Date;
}

/**
 * Share one note with one class's teacher. The RLS insert policy requires the
 * actor to own the note and be an active member of the class; any refusal is
 * reported as "forbidden".
 */
export async function shareNote(actor: Actor, noteId: string, classId: string, now: Date = new Date()): Promise<NoteShare> {
  assertUuid(noteId, "Note");
  if (typeof classId !== "string" || !UUID.test(classId)) throw new DomainError("forbidden", "You can only share notes with a class you belong to.");
  const share = await vaultTx(
    actor,
    async (tx) => {
      await tx.insert(t.vaultShares).values({ noteId, classId, sharedBy: actor.id, createdAt: now }).onConflictDoNothing();
      const [row] = await tx
        .select({ noteId: t.vaultShares.noteId, classId: t.vaultShares.classId, sharedAt: t.vaultShares.createdAt, className: t.classes.name })
        .from(t.vaultShares)
        .innerJoin(t.classes, eq(t.classes.id, t.vaultShares.classId))
        .where(and(eq(t.vaultShares.noteId, noteId), eq(t.vaultShares.classId, classId), eq(t.vaultShares.sharedBy, actor.id)));
      if (!row) throw new DomainError("forbidden", "You can only share notes with a class you belong to.");
      return row;
    },
    "You can only share your own notes with a class you belong to.",
  );
  await (await getDb()).insert(t.auditLogs).values({ actorId: actor.id, action: "vault.note_shared", entityType: "vault_note", entityId: noteId, metadata: { classId } });
  return share;
}

/** Revoke a share. The teacher immediately loses access to the note. */
export async function unshareNote(actor: Actor, noteId: string, classId: string): Promise<{ unshared: true }> {
  assertUuid(noteId, "Note");
  assertUuid(classId, "Share");
  const [gone] = await vaultTx(actor, (tx) =>
    tx
      .delete(t.vaultShares)
      .where(and(eq(t.vaultShares.noteId, noteId), eq(t.vaultShares.classId, classId), eq(t.vaultShares.sharedBy, actor.id)))
      .returning({ noteId: t.vaultShares.noteId }),
  );
  if (!gone) throw new DomainError("not_found", "Share not found.");
  await (await getDb()).insert(t.auditLogs).values({ actorId: actor.id, action: "vault.note_unshared", entityType: "vault_note", entityId: noteId, metadata: { classId } });
  return { unshared: true };
}

/** Classes one of the actor's notes is shared with. */
export async function listNoteShares(actor: Actor, noteId: string): Promise<NoteShare[]> {
  assertUuid(noteId, "Note");
  return vaultTx(actor, async (tx) => {
    await loadOwnNote(tx, actor.id, noteId);
    return tx
      .select({ noteId: t.vaultShares.noteId, classId: t.vaultShares.classId, className: t.classes.name, sharedAt: t.vaultShares.createdAt })
      .from(t.vaultShares)
      .innerJoin(t.classes, eq(t.classes.id, t.vaultShares.classId))
      .where(and(eq(t.vaultShares.noteId, noteId), eq(t.vaultShares.sharedBy, actor.id)))
      .orderBy(asc(t.classes.name));
  });
}

export interface SharedNoteForTeacher {
  noteId: string;
  title: string;
  body: string;
  tags: string[];
  authorName: string;
  sharedAt: Date;
  updatedAt: Date;
}

/** Notes students explicitly shared with a class the actor teaches (newest share first). */
export async function listSharedNotesForClass(actor: Actor, classId: string): Promise<SharedNoteForTeacher[]> {
  assertUuid(classId, "Class");
  return vaultTx(actor, async (tx) => {
    const [cls] = await tx.select({ teacherId: t.classes.teacherId }).from(t.classes).where(eq(t.classes.id, classId));
    if (!cls) throw new DomainError("not_found", "Class not found.");
    if (cls.teacherId !== actor.id) throw new DomainError("forbidden", "Only the class teacher can see notes shared with this class.");
    // vault_notes RLS admits a note here only through a vault_shares row for this teacher's class.
    const rows = await tx
      .select({ noteId: t.vaultNotes.id, title: t.vaultNotes.title, body: t.vaultNotes.body, tags: t.vaultNotes.tags, updatedAt: t.vaultNotes.updatedAt, sharedAt: t.vaultShares.createdAt, authorName: t.users.name })
      .from(t.vaultShares)
      .innerJoin(t.vaultNotes, eq(t.vaultNotes.id, t.vaultShares.noteId))
      .leftJoin(t.users, eq(t.users.id, t.vaultNotes.userId))
      .where(eq(t.vaultShares.classId, classId))
      .orderBy(desc(t.vaultShares.createdAt), asc(t.vaultNotes.id));
    return rows.map((r) => ({ ...r, authorName: r.authorName ?? "Student" }));
  });
}

// ──────────────────────────────── export ────────────────────────────────────

/**
 * Vault export format "aceap.vault-export".
 *
 * Versioning: semantic. Minor/patch versions only add optional fields, so an
 * importer for 1.x must accept any 1.y.z. Dates are ISO-8601 strings.
 * Contents: the owner's notes and links, the concepts they reference or have
 * evidence on, shared edges among those concepts, the owner's mastery,
 * bounded mastery history and misconceptions. Never included: question text
 * or answers, other people's data, emails, internal ids of other users,
 * secrets.
 */
export const VAULT_EXPORT_SCHEMA = "aceap.vault-export" as const;
export const VAULT_EXPORT_SCHEMA_VERSION = "1.0.0";
export const VAULT_EXPORT_LICENSING_NOTE = "Question text and third-party content are not included; AceAP lesson content remains © AceAP and is referenced by id.";

const isoDate = z.iso.datetime({ offset: true });
const misconceptionStatus = z.enum(["hypothesis", "teacher_confirmed", "potentially_resolved", "resolved"]);

export const vaultExportSchema = z.strictObject({
  schema: z.literal(VAULT_EXPORT_SCHEMA),
  schemaVersion: z.string().regex(/^1\.\d+\.\d+$/, "Unsupported vault export version."),
  exportedAt: isoDate,
  owner: z.strictObject({ name: z.string() }),
  notes: z.array(
    z.object({
      id: z.string(),
      title: z.string().min(1).max(MAX_NOTE_TITLE_LENGTH),
      body: z.string(),
      tags: z.array(z.string()),
      folder: z.string(),
      createdAt: isoDate,
      updatedAt: isoDate,
      links: z.array(z.object({ targetType: z.enum(["note", "skill", "unresolved"]), targetId: z.string(), label: z.string() })),
    }),
  ),
  concepts: z.array(z.object({ skillId: z.string(), name: z.string(), courseId: z.string(), courseName: z.string() })),
  conceptEdges: z.array(z.object({ source: z.string(), target: z.string(), type: z.enum(["PREREQUISITE_OF", "RELATED_TO", "APPLIED_IN", "EXPLAINS"]), rationale: z.string().nullable() })),
  mastery: z.array(
    z.object({
      skillId: z.string(),
      level: z.enum(MASTERY_LEVELS),
      needsReview: z.boolean(),
      estimate: z.number().min(0).max(1),
      evidenceSummary: z.string(),
      lastDemonstratedAt: isoDate.nullable(),
      calcVersion: z.string(),
      policyVersion: z.number().int(),
    }),
  ),
  masteryHistory: z.array(z.object({ skillId: z.string(), at: isoDate, level: z.enum(MASTERY_LEVELS), estimate: z.number(), needsReview: z.boolean(), evidenceCount: z.number().int() })),
  misconceptions: z.array(z.object({ skillId: z.string(), title: z.string(), status: misconceptionStatus, firstObservedAt: isoDate, lastObservedAt: isoDate })),
  courses: z.array(z.object({ courseId: z.string(), name: z.string() })),
  licensing: z.object({ note: z.string() }),
});

/** The JSON export document (also the input contract for a future import). */
export type VaultExport = z.infer<typeof vaultExportSchema>;

/** Validate an export document (object or JSON text) against the versioned schema. */
export function validateVaultExport(json: unknown): ReturnType<typeof vaultExportSchema.safeParse> {
  let value = json;
  if (typeof json === "string") {
    try {
      value = JSON.parse(json);
    } catch {
      value = undefined;
    }
  }
  return vaultExportSchema.safeParse(value);
}

export interface VaultExportFile {
  filename: string;
  contentType: string;
  body: string;
}

/** Collect the actor's export document (RLS-scoped reads only). */
async function buildExport(actor: Actor, now: Date): Promise<VaultExport> {
  const db = await getDb();
  const own = await asUser(actor, async (tx) => {
    const [me] = await tx.select({ name: t.users.name }).from(t.users).where(eq(t.users.id, actor.id));
    const notes = await tx.select().from(t.vaultNotes).where(eq(t.vaultNotes.userId, actor.id)).orderBy(asc(t.vaultNotes.createdAt), asc(t.vaultNotes.id));
    const links = notes.length ? await tx.select().from(t.vaultLinks).where(and(eq(t.vaultLinks.userId, actor.id), inArray(t.vaultLinks.noteId, notes.map((n) => n.id)))) : [];
    const states = await tx.select().from(t.masteryStates).where(eq(t.masteryStates.userId, actor.id)).orderBy(asc(t.masteryStates.skillId));
    const evidenceSkills = await tx.selectDistinct({ skillId: t.masteryEvidence.skillId }).from(t.masteryEvidence).where(eq(t.masteryEvidence.userId, actor.id));
    const snapshots = await tx
      .select()
      .from(t.masterySnapshots)
      .where(eq(t.masterySnapshots.userId, actor.id))
      .orderBy(desc(t.masterySnapshots.createdAt), asc(t.masterySnapshots.id))
      .limit(EXPORT_MAX_SNAPSHOTS);
    const detected = await tx.select().from(t.detectedMisconceptions).where(eq(t.detectedMisconceptions.userId, actor.id)).orderBy(asc(t.detectedMisconceptions.firstObservedAt));
    return { name: me?.name ?? "", notes, links, states, evidenceSkills, snapshots, detected };
  });

  const conceptIds = [
    ...new Set([...own.links.filter((l) => l.targetType === "skill").map((l) => l.targetId), ...own.states.map((s) => s.skillId), ...own.evidenceSkills.map((e) => e.skillId)]),
  ].sort();
  const dir = await skillDirectory(db, conceptIds);
  const [prereqs, relations, catalog] = conceptIds.length
    ? await Promise.all([
        db.select().from(t.skillPrerequisites).where(and(inArray(t.skillPrerequisites.skillId, conceptIds), inArray(t.skillPrerequisites.prerequisiteSkillId, conceptIds))),
        db.select().from(t.skillRelationships).where(and(inArray(t.skillRelationships.fromSkillId, conceptIds), inArray(t.skillRelationships.toSkillId, conceptIds))),
        own.detected.length ? db.select({ id: t.misconceptions.id, title: t.misconceptions.title }).from(t.misconceptions).where(inArray(t.misconceptions.id, own.detected.map((d) => d.misconceptionId))) : Promise.resolve([]),
      ])
    : [[], [], []];

  const concepts = conceptIds.map((id) => dir.get(id)).filter((s): s is NonNullable<typeof s> => Boolean(s));
  const courses = [...new Map(concepts.map((c) => [c.courseId, { courseId: c.courseId, name: c.courseName }])).values()].sort((a, b) => a.courseId.localeCompare(b.courseId));

  return {
    schema: VAULT_EXPORT_SCHEMA,
    schemaVersion: VAULT_EXPORT_SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    owner: { name: own.name },
    notes: own.notes.map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      tags: n.tags,
      folder: n.folder,
      createdAt: n.createdAt.toISOString(),
      updatedAt: n.updatedAt.toISOString(),
      links: own.links
        .filter((l) => l.noteId === n.id)
        .map((l) => ({ targetType: l.targetType, targetId: l.targetId, label: l.label }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    })),
    concepts: concepts.map((c) => ({ skillId: c.id, name: c.name, courseId: c.courseId, courseName: c.courseName })),
    conceptEdges: [
      ...prereqs.map((p) => ({ source: p.prerequisiteSkillId, target: p.skillId, type: "PREREQUISITE_OF" as const, rationale: null })),
      ...relations.map((r) => ({ source: r.fromSkillId, target: r.toSkillId, type: r.type, rationale: r.rationale })),
    ].sort((a, b) => a.source.localeCompare(b.source) || a.target.localeCompare(b.target) || a.type.localeCompare(b.type)),
    mastery: own.states.map((s) => ({
      skillId: s.skillId,
      level: s.level,
      needsReview: s.needsReview,
      estimate: s.estimate,
      evidenceSummary: s.explanation.summary,
      lastDemonstratedAt: s.lastDemonstratedAt?.toISOString() ?? null,
      calcVersion: s.calcVersion,
      policyVersion: s.policyVersion,
    })),
    masteryHistory: own.snapshots
      .map((s) => ({ skillId: s.skillId, at: s.createdAt.toISOString(), level: s.level, estimate: s.estimate, needsReview: s.needsReview, evidenceCount: s.evidenceCount }))
      .reverse(),
    misconceptions: own.detected.map((d) => ({
      skillId: d.skillId,
      title: catalog.find((m) => m.id === d.misconceptionId)?.title ?? d.misconceptionId,
      status: d.status,
      firstObservedAt: d.firstObservedAt.toISOString(),
      lastObservedAt: d.lastObservedAt.toISOString(),
    })),
    courses,
    licensing: { note: VAULT_EXPORT_LICENSING_NOTE },
  };
}

const yamlString = (s: string) => JSON.stringify(s); // JSON strings are valid YAML double-quoted scalars.
const cell = (s: string) => s.replace(/\|/g, "\\|").replace(/\s+/g, " ").trim();

/** Render an export document as one Markdown file: a front-matter section per note plus a mastery table. */
export function renderVaultMarkdown(doc: VaultExport): string {
  const out: string[] = [
    "# AceAP Knowledge Vault",
    "",
    `Exported ${doc.exportedAt}${doc.owner.name ? ` for ${doc.owner.name}` : ""} · ${doc.schema} ${doc.schemaVersion} · ${doc.notes.length} note${doc.notes.length === 1 ? "" : "s"}`,
    "",
    `> ${doc.licensing.note}`,
    "",
  ];
  for (const n of doc.notes) {
    out.push(
      "---",
      `title: ${yamlString(n.title)}`,
      `tags: [${n.tags.map(yamlString).join(", ")}]`,
      ...(n.folder ? [`folder: ${yamlString(n.folder)}`] : []),
      `created: ${n.createdAt}`,
      `updated: ${n.updatedAt}`,
      "---",
      "",
      n.body.trimEnd(),
      "",
    );
  }
  const names = new Map(doc.concepts.map((c) => [c.skillId, c]));
  out.push("## Mastery summary", "");
  if (doc.mastery.length === 0) out.push("No mastery evidence yet.", "");
  else {
    out.push("| Concept | Course | Level | Needs review | Last demonstrated |", "|---|---|---|---|---|");
    for (const m of doc.mastery) {
      const c = names.get(m.skillId);
      out.push(`| ${cell(c?.name ?? m.skillId)} | ${cell(c?.courseName ?? "")} | ${LEVEL_LABEL[m.level]} | ${m.needsReview ? "Yes" : "No"} | ${m.lastDemonstratedAt ? m.lastDemonstratedAt.slice(0, 10) : "—"} |`);
    }
    out.push("");
  }
  return out.join("\n");
}

/** Export the actor's vault as JSON (versioned schema) or a single Markdown document, and record the export. */
export async function exportVault(actor: Actor, format: "json" | "markdown", now: Date = new Date()): Promise<VaultExportFile> {
  if (format !== "json" && format !== "markdown") throw new DomainError("invalid", "Choose JSON or Markdown.");
  const doc = await buildExport(actor, now);
  const checked = vaultExportSchema.parse(doc); // Never ship a document our own importer would reject.
  const counts = {
    notes: checked.notes.length,
    links: checked.notes.reduce((n, x) => n + x.links.length, 0),
    concepts: checked.concepts.length,
    mastery: checked.mastery.length,
    masteryHistory: checked.masteryHistory.length,
    misconceptions: checked.misconceptions.length,
  };
  await vaultTx(actor, (tx) => tx.insert(t.vaultExports).values({ userId: actor.id, format, schemaVersion: VAULT_EXPORT_SCHEMA_VERSION, counts, createdAt: now }));
  const day = now.toISOString().slice(0, 10);
  return format === "json"
    ? { filename: `aceap-vault-${day}.json`, contentType: "application/json; charset=utf-8", body: JSON.stringify(checked, null, 2) }
    : { filename: `aceap-vault-${day}.md`, contentType: "text/markdown; charset=utf-8", body: renderVaultMarkdown(checked) };
}
