/**
 * Search across shared curriculum and the requester's own vault notes.
 *
 *  - Shared curriculum (all 43 catalog courses, their units, and the full text
 *    of pilot lessons, skills, objectives and formulas) is indexed once and
 *    cached in-process; call `invalidateSearchIndex()` after a content sync.
 *  - Vault notes are private: they are fetched per request through `asUser`
 *    and filtered to the requester's own notes (never shared notes of others).
 *  - Question bodies, answer keys and solutions are never read, so they can
 *    never appear in results.
 *
 * Ranking is BM25-style over weighted fields, with light stemming, stop-word
 * removal, a small domain synonym map, phrase-proximity bonuses, and a boost
 * for skills linked to matching lessons/objectives.
 */
import { and, desc, eq, isNotNull } from "drizzle-orm";
import { z } from "zod";
import { asUser, getDb, type Actor } from "@/db/client";
import * as t from "@/db/schema";
import { DomainError } from "@/lib/errors";
import type { LessonBlock } from "@/modules/content/schema";

// ─────────────────────────────────── types ──────────────────────────────────

export type SearchGroup = "courses" | "units" | "lessons" | "skills" | "objectives" | "formulas" | "notes";

/** How much AceAP content stands behind a result — never implied to be more than it is. */
export type ContentAvailability = "available" | "outline_only" | "catalog_only";

export interface SearchResult {
  group: SearchGroup;
  id: string;
  title: string;
  snippet: string;
  href: string;
  score: number;
  courseId?: string;
  courseName?: string;
  /** Why this matched, in plain language. */
  reason: string;
  availability?: ContentAvailability;
  /** Formula results only: the LaTeX source to render. */
  latex?: string;
}

export interface SearchResponse {
  query: string;
  /** Normalised query terms (after stop words and stemming). */
  terms: string[];
  courses: SearchResult[];
  units: SearchResult[];
  lessons: SearchResult[];
  skills: SearchResult[];
  objectives: SearchResult[];
  formulas: SearchResult[];
  notes: SearchResult[];
  /** Top results across every group. */
  best: SearchResult[];
}

export const searchOptionsSchema = z.object({
  courseId: z.string().trim().min(1).max(100).optional(),
  limit: z.number().int().min(1).max(50).default(8),
});
export type SearchOptions = z.input<typeof searchOptionsSchema>;

// ──────────────────────────────── text handling ─────────────────────────────

const STOP_WORDS = new Set(
  "a an and are as at be been but by can could did do does doing for from had has have how i if in into is it its me my of off on or our so such than that the their them then there these they this to too us was we were what when where which while who whom why will with would you your yours about after again all also am any because before being both each few further here just more most much no nor not now only other own same should some very find get use using between".split(" "),
);

/** LaTeX commands that carry meaning; every other command is dropped. */
const LATEX_WORDS: Record<string, string> = {
  sin: "sin", cos: "cos", tan: "tan", sec: "sec", csc: "csc", cot: "cot", ln: "ln", log: "log", exp: "exp",
  sqrt: "sqrt root", int: "integral", sum: "sum", lim: "limit", infty: "infinity",
  Delta: "delta", delta: "delta", pi: "pi", theta: "theta", alpha: "alpha", beta: "beta", omega: "omega", lambda: "lambda", mu: "mu", sigma: "sigma",
  prime: "prime", approx: "approximately",
};

/** Words implied by notation, e.g. dy/dx or f′(x) → "derivative". */
function notationWords(raw: string): string {
  const extra: string[] = [];
  if (/\\[dt]?frac\{d[a-z]?\}\{d[a-z]\}|\bd[a-z]?\s*\/\s*d[a-z]\b|[a-z]'\s*\(|[a-z]′/i.test(raw)) extra.push("derivative");
  if (/\\int\b|∫/.test(raw)) extra.push("integral");
  return extra.join(" ");
}

/** Strip Markdown and LaTeX to plain words (keeping the meaningful LaTeX tokens). */
export function toPlainText(raw: string): string {
  return raw
    .normalize("NFKD")
    .replace(/\\([a-zA-Z]+)/g, (_, name: string) => ` ${LATEX_WORDS[name] ?? ""} `)
    .replace(/\\[^a-zA-Z]/g, " ")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[′']/g, " ")
    .replace(/Δ/g, " delta ")
    .replace(/[*_#>|`~${}^\\]/g, " ")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .replace(/\s+([.,;:!?)])/g, "$1")
    .trim();
}

/** Light stemmer: plurals, -ing, -ed, -ation/-ization, trailing -e. Deterministic and symmetric for query and documents. */
export function stem(word: string): string {
  let w = word;
  if (w.length <= 3 || /^\d/.test(w)) return w;
  if (w.endsWith("ies") && w.length > 4) w = `${w.slice(0, -3)}y`;
  else if (w.endsWith("sses")) w = w.slice(0, -2);
  else if (w.endsWith("s") && !/(ss|us|is)$/.test(w)) w = w.slice(0, -1);
  if (w.endsWith("ization")) w = w.slice(0, -5);
  else if (w.endsWith("tion") && w.length > 6) w = w.slice(0, -3);
  else if (w.endsWith("ing") && w.length > 5) w = undouble(w.slice(0, -3));
  else if (w.endsWith("ed") && w.length > 4) w = undouble(w.slice(0, -2));
  if (w.endsWith("e") && w.length > 4) w = w.slice(0, -1);
  return w;
}

function undouble(w: string): string {
  return /([b-df-hj-np-tv-z])\1$/.test(w) && !/(ll|ss|zz)$/.test(w) ? w.slice(0, -1) : w;
}

interface Word {
  surface: string;
  term: string;
}

function words(text: string): Word[] {
  const out: Word[] = [];
  for (const m of toPlainText(`${text} ${notationWords(text)}`).toLowerCase().matchAll(/[a-z0-9]+/g)) {
    const w = m[0];
    if (w.length < 2 || STOP_WORDS.has(w)) continue;
    out.push({ surface: w, term: stem(w) });
  }
  return out;
}

/** Lowercase, strip markup, drop stop words and single characters, stem. */
export function tokenize(text: string): string[] {
  return words(text).map((w) => w.term);
}

// ─────────────────────────────── query parsing ──────────────────────────────

/** Small domain synonym map. Each group's phrases are interchangeable. */
const SYNONYM_GROUPS: string[][] = [
  ["derivative", "differentiate", "differentiation", "slope", "rate of change"],
  ["profit maximizing", "profit maximization", "MR = MC", "marginal revenue equals marginal cost"],
  ["velocity", "speed"],
  ["chain rule", "composite", "composition"],
  ["integral", "antiderivative", "area under"],
  ["trig", "trigonometric", "sine", "cosine"],
  ["sin", "sine"],
  ["cos", "cosine"],
  ["ln", "natural log", "logarithm"],
  ["displacement", "change in position"],
  ["distance", "path length"],
  ["photosynthesis", "cellular energetics", "chloroplast", "light reactions", "calvin cycle"],
  ["cellular respiration", "cellular energetics", "mitochondria"],
  ["monopoly", "monopolist", "imperfect competition"],
  ["MR", "marginal revenue"],
  ["MC", "marginal cost"],
  ["free fall", "gravity"],
  ["average", "mean"],
];

const SYNONYMS: { phrases: { surface: string; terms: string[] }[] }[] = SYNONYM_GROUPS.map((g) => ({
  phrases: g.map((surface) => ({ surface, terms: tokenize(surface) })).filter((p) => p.terms.length > 0),
}));

const EXPANSION_WEIGHT = 0.6;

interface QueryTerm {
  /** One stemmed token, or a token sequence that must match contiguously. */
  terms: string[];
  weight: number;
  /** Indices of original query words this term stands for (for coverage). */
  covers: Set<number>;
  surface: string;
}

interface QueryPhrase {
  terms: string[];
  weight: number;
}

interface ParsedQuery {
  terms: QueryTerm[];
  phrases: QueryPhrase[];
  originalCount: number;
}

function indexOfSequence(haystack: string[], needle: string[], from = 0): number {
  outer: for (let i = from; i + needle.length <= haystack.length; i++) {
    for (let j = 0; j < needle.length; j++) if (haystack[i + j] !== needle[j]) continue outer;
    return i;
  }
  return -1;
}

/** f(g(x))-shaped input such as sin(x^2), e^(3x) or (x^2+1)^3 implies the chain rule. */
function looksComposite(raw: string): boolean {
  const s = raw.toLowerCase();
  // A non-trivial inner expression: contains a variable but is not just a variable.
  const nonTrivial = (inner: string) => {
    const x = inner.replace(/\s+/g, "");
    return /[a-z]/.test(x) && !/^[a-z]$/.test(x);
  };
  for (const m of s.matchAll(/\b(?:sin|cos|tan|sec|csc|cot|ln|log|exp|sqrt)\s*\(([^()]+)\)/g)) if (nonTrivial(m[1])) return true;
  for (const m of s.matchAll(/\be\s*\^\s*(?:\(([^()]+)\)|([a-z0-9.]+))/g)) if (nonTrivial(m[1] ?? m[2])) return true;
  return /\([^()]*[a-z][^()]*[+\-*/][^()]*\)\s*\^/.test(s);
}

/**
 * Query → weighted terms. Original words weigh 1. Synonym expansions weigh
 * less, and a multi-word expansion ("cellular energetics") is one term that
 * only matches as a contiguous phrase — never word by word.
 */
function parseQuery(raw: string): ParsedQuery {
  const base = words(raw);
  const stems = base.map((w) => w.term);
  const merged = new Map<string, QueryTerm>();
  const add = (terms: string[], weight: number, covers: number[], surface: string) => {
    const k = terms.join(" ");
    const cur = merged.get(k);
    if (!cur) merged.set(k, { terms, weight, covers: new Set(covers), surface });
    else {
      for (const c of covers) cur.covers.add(c);
      if (weight > cur.weight) Object.assign(cur, { weight, surface });
    }
  };
  base.forEach((w, i) => add([w.term], 1, [i], w.surface));

  // Proximity bonuses for adjacent original words and the whole query.
  const phrases: QueryPhrase[] = [];
  for (let i = 0; i + 1 < stems.length; i++) phrases.push({ terms: [stems[i], stems[i + 1]], weight: 1 });
  if (stems.length > 2) phrases.push({ terms: stems, weight: 1 });

  for (const group of SYNONYMS) {
    for (const p of group.phrases) {
      const at = indexOfSequence(stems, p.terms);
      if (at < 0) continue;
      const covers = p.terms.map((_, k) => at + k);
      for (const q of group.phrases) if (q !== p) add(q.terms, EXPANSION_WEIGHT, covers, q.surface);
    }
  }
  if (looksComposite(raw)) {
    add(tokenize("chain rule"), EXPANSION_WEIGHT, [], "chain rule");
    add(tokenize("composite"), EXPANSION_WEIGHT, [], "composite");
  }
  return { terms: [...merged.values()], phrases, originalCount: base.length };
}

// ─────────────────────────────────── index ──────────────────────────────────

type FieldName = "title" | "keywords" | "summary" | "body" | "context";

const FIELD_WEIGHT: Record<FieldName, number> = { title: 3, keywords: 2.5, summary: 1.5, body: 1, context: 0.5 };
const FIELD_LABEL: Record<FieldName, string> = {
  title: "Title matches",
  keywords: "Keyword match",
  summary: "Description matches",
  body: "Mentioned in the text",
  context: "Related course content matches",
};

interface Field {
  name: FieldName;
  tokens: string[];
  tf: Map<string, number>;
}

interface IndexedDoc {
  group: SearchGroup;
  id: string;
  title: string;
  href: string;
  /** Plain text the snippet is cut from. */
  plain: string;
  fields: Field[];
  courseId?: string;
  courseName?: string;
  availability?: ContentAvailability;
  latex?: string;
  /** Lessons / objectives: skills they teach or assess (for the relationship boost). */
  linkedSkillIds?: string[];
}

interface SearchIndex {
  docs: IndexedDoc[];
  df: Map<string, number>;
  avgLen: Record<FieldName, number>;
  builtAt: Date;
}

function field(name: FieldName, text: string): Field {
  const tokens = tokenize(text);
  const tf = new Map<string, number>();
  for (const tok of tokens) tf.set(tok, (tf.get(tok) ?? 0) + 1);
  return { name, tokens, tf };
}

function makeDoc(base: Omit<IndexedDoc, "fields" | "plain">, texts: Partial<Record<FieldName, string>>, plain: string): IndexedDoc {
  const fields = (Object.entries(texts) as [FieldName, string | undefined][]).filter(([, v]) => v && v.trim()).map(([k, v]) => field(k, v as string));
  return { ...base, fields, plain: toPlainText(plain).slice(0, 4000) };
}

/** Searchable text of a lesson block. Check blocks (banked questions) are skipped entirely. */
function blockText(b: LessonBlock): string {
  switch (b.type) {
    case "text":
      return b.md;
    case "callout":
      return `${b.title ?? ""} ${b.md}`;
    case "definition":
      return `${b.term}. ${b.md}`;
    case "formula":
      return `${b.caption ?? ""} ${b.latex}`;
    case "worked_example":
      return [b.title, b.problem, ...b.steps.map((s) => `${s.title ?? ""} ${s.md}`), b.answer ?? ""].join(" ");
    case "simulation":
      return [b.title ?? "", ...(b.explore ?? [])].join(" ");
    case "note_prompt":
      return `${b.suggestedTitle}. ${b.prompt}`;
    case "tutor_prompt":
      return b.prompts.join(" ");
    case "summary":
      return b.points.join(" ");
    case "image":
      return `${b.alt} ${b.caption ?? ""}`;
    case "check":
      return "";
  }
}

const courseAvailability = (s: t.CourseContentStatus): ContentAvailability =>
  s === "pilot_available" || s === "complete" ? "available" : s === "catalog_only" ? "catalog_only" : "outline_only";

const AVAILABILITY_NOTE: Record<ContentAvailability, string> = {
  available: "",
  outline_only: "Outline only — AceAP hasn't written lessons for this yet.",
  catalog_only: "Catalog listing only — AceAP has no outline or lessons for this course yet.",
};

async function buildIndex(): Promise<SearchIndex> {
  const db = await getDb();
  const [courseRows, versionRows, unitRows, topicRows, lessonRows, lessonVersionRows, skillRows, objectiveRows, objectiveSkillRows, lessonSkillRows] = await Promise.all([
    db.select().from(t.courses),
    db.select({ id: t.courseVersions.id }).from(t.courseVersions).where(eq(t.courseVersions.isCurrent, true)),
    db.select({ u: t.units }).from(t.units).innerJoin(t.courseVersions, and(eq(t.courseVersions.id, t.units.courseVersionId), eq(t.courseVersions.isCurrent, true))),
    db.select().from(t.topics),
    db.select().from(t.lessons).where(isNotNull(t.lessons.publishedVersion)),
    db
      .select({ lessonId: t.lessonVersions.lessonId, blocks: t.lessonVersions.blocks })
      .from(t.lessonVersions)
      .innerJoin(t.lessons, and(eq(t.lessons.id, t.lessonVersions.lessonId), eq(t.lessons.publishedVersion, t.lessonVersions.version))),
    db.select().from(t.skills),
    db.select().from(t.learningObjectives),
    db.select().from(t.objectiveSkills),
    db.select().from(t.lessonSkills),
  ]);

  const courses = new Map(courseRows.map((c) => [c.id, c]));
  const currentVersions = new Set(versionRows.map((v) => v.id));
  const units = unitRows.map((r) => r.u);
  const unitById = new Map(units.map((u) => [u.id, u]));
  const topicById = new Map(topicRows.map((tp) => [tp.id, tp]));
  const blocksByLesson = new Map(lessonVersionRows.map((v) => [v.lessonId, v.blocks]));
  const skillsByLesson = new Map<string, string[]>();
  for (const r of lessonSkillRows) skillsByLesson.set(r.lessonId, [...(skillsByLesson.get(r.lessonId) ?? []), r.skillId]);
  const skillsByObjective = new Map<string, string[]>();
  for (const r of objectiveSkillRows) skillsByObjective.set(r.objectiveId, [...(skillsByObjective.get(r.objectiveId) ?? []), r.skillId]);
  const unitHref = (courseId: string, unitId: string | undefined) => {
    const u = unitId ? unitById.get(unitId) : undefined;
    return u ? `/app/courses/${courseId}/units/${u.slug}` : `/app/courses/${courseId}`;
  };
  const courseCtx = (courseId: string) => {
    const c = courses.get(courseId);
    return { courseId, courseName: c?.name ?? courseId };
  };

  const docs: IndexedDoc[] = [];

  for (const c of courseRows) {
    const unitTitles = units.filter((u) => u.courseId === c.id).map((u) => u.title).join(". ");
    docs.push(makeDoc({ group: "courses", id: c.id, title: c.name, href: `/app/courses/${c.id}`, courseId: c.id, courseName: c.name, availability: courseAvailability(c.contentStatus) }, { title: c.name, summary: c.description, context: `${c.category.replace(/-/g, " ")}. ${unitTitles}` }, c.description));
  }

  for (const u of units) {
    const c = courses.get(u.courseId);
    const availability: ContentAvailability = u.status === "available" ? "available" : "outline_only";
    const desc = u.description || `Unit ${u.number} of ${c?.name ?? u.courseId}.`;
    docs.push(makeDoc({ group: "units", id: u.id, title: `Unit ${u.number}: ${u.title}`, href: unitHref(u.courseId, u.id), availability, ...courseCtx(u.courseId) }, { title: u.title, summary: u.description, context: c?.name }, desc));
  }

  for (const l of lessonRows) {
    const blocks = blocksByLesson.get(l.id) ?? [];
    const topic = topicById.get(l.topicId);
    const body = blocks.map(blockText).join(" \n ");
    docs.push(
      makeDoc(
        { group: "lessons", id: l.id, title: l.title, href: `/app/learn/${l.id}`, availability: "available", linkedSkillIds: skillsByLesson.get(l.id) ?? [], ...courseCtx(l.courseId) },
        { title: l.title, summary: l.summary, body, context: topic ? `${topic.title}. ${topic.description}` : undefined },
        `${l.summary} ${body}`,
      ),
    );
    blocks.forEach((b, i) => {
      if (b.type !== "formula") return;
      const title = b.caption ?? `Formula from “${l.title}”`;
      docs.push(
        makeDoc(
          { group: "formulas", id: `${l.id}#formula-${i}`, title, href: `/app/learn/${l.id}`, availability: "available", latex: b.latex, ...courseCtx(l.courseId) },
          { title: b.caption, keywords: b.latex, context: l.title },
          `${b.caption ?? ""} — from “${l.title}”`,
        ),
      );
    });
  }

  for (const s of skillRows) {
    docs.push(
      makeDoc(
        { group: "skills", id: s.id, title: s.name, href: `/app/skills/${s.id}`, availability: "available", ...courseCtx(s.courseId) },
        { title: s.name, keywords: s.keywords.join(". "), summary: s.description },
        `${s.description} Keywords: ${s.keywords.join(", ")}.`,
      ),
    );
  }

  for (const o of objectiveRows) {
    if (!currentVersions.has(o.courseVersionId)) continue;
    const topic = topicById.get(o.topicId);
    docs.push(
      makeDoc(
        { group: "objectives", id: o.id, title: `${o.code}: ${o.description}`, href: unitHref(o.courseId, topic?.unitId), availability: "available", linkedSkillIds: skillsByObjective.get(o.id) ?? [], ...courseCtx(o.courseId) },
        { title: o.code, summary: o.description, context: topic?.title },
        o.description,
      ),
    );
  }

  const df = new Map<string, number>();
  const lenTotals: Record<FieldName, { sum: number; n: number }> = { title: { sum: 0, n: 0 }, keywords: { sum: 0, n: 0 }, summary: { sum: 0, n: 0 }, body: { sum: 0, n: 0 }, context: { sum: 0, n: 0 } };
  for (const d of docs) {
    const seen = new Set<string>();
    for (const f of d.fields) {
      lenTotals[f.name].sum += f.tokens.length;
      lenTotals[f.name].n += 1;
      for (const tok of f.tf.keys()) seen.add(tok);
    }
    for (const tok of seen) df.set(tok, (df.get(tok) ?? 0) + 1);
  }
  const avgLen = Object.fromEntries((Object.keys(lenTotals) as FieldName[]).map((k) => [k, lenTotals[k].n ? lenTotals[k].sum / lenTotals[k].n : 1])) as Record<FieldName, number>;
  return { docs, df, avgLen, builtAt: new Date() };
}

let indexPromise: Promise<SearchIndex> | null = null;

function getIndex(): Promise<SearchIndex> {
  if (!indexPromise) {
    indexPromise = buildIndex();
    indexPromise.catch(() => {
      indexPromise = null;
    });
  }
  return indexPromise;
}

/** Drop the cached curriculum index (call after content sync). Notes are never cached. */
export function invalidateSearchIndex(): void {
  indexPromise = null;
}

// ────────────────────────────────── scoring ─────────────────────────────────

const K1 = 1.2;
const B = 0.75;
const NON_AVAILABLE_FACTOR = 0.6;
const RELATIONSHIP_BOOST = 0.35;
const MIN_SCORE = 0.05;

interface Scored {
  doc: IndexedDoc;
  score: number;
  /** Surface forms of the query terms matched in the top-scoring field. */
  matched: string[];
  matchedTerms: Set<string>;
  topField: FieldName | null;
  linkedFrom: string | null;
}

function idf(index: SearchIndex, term: string): number {
  const n = index.docs.length;
  const d = index.df.get(term) ?? 0;
  return Math.log(1 + (n - d + 0.5) / (d + 0.5));
}

/** Are `terms` consecutive (exact) or at least ordered within a small window? 1 / 0.5 / 0. */
function proximity(tokens: string[], terms: string[]): number {
  if (terms.length < 2 || tokens.length < terms.length) return 0;
  if (indexOfSequence(tokens, terms) >= 0) return 1;
  const window = terms.length + 2;
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i] !== terms[0]) continue;
    let pos = i;
    let ok = true;
    for (const term of terms.slice(1)) {
      const next = tokens.indexOf(term, pos + 1);
      if (next < 0 || next - i >= window) {
        ok = false;
        break;
      }
      pos = next;
    }
    if (ok) return 0.5;
  }
  return 0;
}

/** Occurrences of a term (single token or contiguous sequence) in a field. */
function termFrequency(f: Field, terms: string[]): number {
  if (terms.length === 1) return f.tf.get(terms[0]) ?? 0;
  let n = 0;
  for (let at = indexOfSequence(f.tokens, terms); at >= 0; at = indexOfSequence(f.tokens, terms, at + 1)) n += 1;
  return n;
}

function scoreDoc(doc: IndexedDoc, q: ParsedQuery, index: SearchIndex): Scored {
  let score = 0;
  const fieldScore = new Map<FieldName, number>();
  const fieldMatches = new Map<FieldName, Set<string>>();
  const covered = new Set<number>();
  const matchedTerms = new Set<string>();
  for (const qt of q.terms) {
    const w = qt.terms.reduce((s, term) => s + idf(index, term), 0) * qt.weight;
    for (const f of doc.fields) {
      const tf = termFrequency(f, qt.terms);
      if (!tf) continue;
      const norm = (tf * (K1 + 1)) / (tf + K1 * (1 - B + (B * f.tokens.length) / index.avgLen[f.name]));
      const contrib = w * FIELD_WEIGHT[f.name] * norm;
      score += contrib;
      fieldScore.set(f.name, (fieldScore.get(f.name) ?? 0) + contrib);
      const fm = fieldMatches.get(f.name) ?? new Set<string>();
      fm.add(qt.surface);
      fieldMatches.set(f.name, fm);
      for (const c of qt.covers) covered.add(c);
      for (const term of qt.terms) matchedTerms.add(term);
    }
  }
  if (score === 0) return { doc, score: 0, matched: [], matchedTerms, topField: null, linkedFrom: null };

  for (const p of q.phrases) {
    const phraseIdf = p.terms.reduce((s, term) => s + idf(index, term), 0);
    let best = 0;
    for (const f of doc.fields) best = Math.max(best, proximity(f.tokens, p.terms) * FIELD_WEIGHT[f.name]);
    score += 0.5 * p.weight * phraseIdf * best;
  }
  const coverage = q.originalCount ? covered.size / q.originalCount : 1;
  score *= 0.4 + 0.6 * coverage;
  if (doc.availability && doc.availability !== "available") score *= NON_AVAILABLE_FACTOR;
  const topField = [...fieldScore.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  return { doc, score, matched: topField ? [...(fieldMatches.get(topField) ?? [])] : [], matchedTerms, topField, linkedFrom: null };
}

/** Skills taught by matching lessons / assessed by matching objectives get a share of that score. */
function applyRelationshipBoost(scored: Scored[]): void {
  const skills = new Map(scored.filter((s) => s.doc.group === "skills").map((s) => [s.doc.id, s]));
  const best = new Map<string, { boost: number; from: string }>();
  for (const s of scored) {
    if (s.score <= 0 || !s.doc.linkedSkillIds) continue;
    for (const skillId of s.doc.linkedSkillIds) {
      const boost = s.score * RELATIONSHIP_BOOST;
      const cur = best.get(skillId);
      if (!cur || boost > cur.boost) best.set(skillId, { boost, from: s.doc.group === "lessons" ? `lesson “${s.doc.title}”` : `objective ${s.doc.title.split(":")[0]}` });
    }
  }
  for (const [skillId, b] of best) {
    const s = skills.get(skillId);
    if (!s) continue;
    s.score += b.boost;
    s.linkedFrom = b.from;
  }
}

function snippetFor(plain: string, terms: Set<string>, max = 180): string {
  if (!plain) return "";
  let hit = -1;
  for (const m of plain.matchAll(/[A-Za-z0-9]+/g)) {
    if (terms.has(stem(m[0].toLowerCase()))) {
      hit = m.index ?? 0;
      break;
    }
  }
  if (hit < 0 || plain.length <= max) return plain.length <= max ? plain : `${plain.slice(0, max).trimEnd()}…`;
  const start = Math.max(0, hit - 60);
  const end = Math.min(plain.length, start + max);
  return `${start > 0 ? "…" : ""}${plain.slice(start, end).trim()}${end < plain.length ? "…" : ""}`;
}

function reasonFor(s: Scored): string {
  const parts: string[] = [];
  if (s.topField && s.matched.length) parts.push(`${FIELD_LABEL[s.topField]}: ${s.matched.slice(0, 4).map((m) => `“${m}”`).join(", ")}`);
  if (s.linkedFrom) parts.push(`${parts.length ? "also t" : "T"}aught in matching ${s.linkedFrom}`);
  const main = parts.join("; ");
  const note = s.doc.availability && s.doc.availability !== "available" ? AVAILABILITY_NOTE[s.doc.availability] : "";
  return [main, note].filter(Boolean).join(". ");
}

function toResult(s: Scored): SearchResult {
  const d = s.doc;
  return {
    group: d.group,
    id: d.id,
    title: d.title,
    snippet: snippetFor(d.plain, s.matchedTerms),
    href: d.href,
    score: Math.round(s.score * 1000) / 1000,
    ...(d.courseId ? { courseId: d.courseId, courseName: d.courseName } : {}),
    reason: reasonFor(s),
    ...(d.availability ? { availability: d.availability } : {}),
    ...(d.latex ? { latex: d.latex } : {}),
  };
}

// ─────────────────────────────────── notes ──────────────────────────────────

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_NOTES_SCANNED = 1000;

/** The requester's OWN notes only (RLS would also expose notes shared with a teacher). */
async function loadOwnNoteDocs(actor: Actor): Promise<IndexedDoc[]> {
  const rows = await asUser(actor, (tx) =>
    tx
      .select({ id: t.vaultNotes.id, title: t.vaultNotes.title, body: t.vaultNotes.body, tags: t.vaultNotes.tags, folder: t.vaultNotes.folder })
      .from(t.vaultNotes)
      .where(eq(t.vaultNotes.userId, actor.id))
      .orderBy(desc(t.vaultNotes.updatedAt))
      .limit(MAX_NOTES_SCANNED),
  );
  return rows.map((n) => makeDoc({ group: "notes", id: n.id, title: n.title, href: `/app/vault?note=${n.id}` }, { title: n.title, keywords: n.tags.join(". "), body: n.body, context: n.folder }, n.body));
}

// ──────────────────────────────────── API ───────────────────────────────────

const EMPTY_GROUPS = (): Omit<SearchResponse, "query" | "terms" | "best"> => ({ courses: [], units: [], lessons: [], skills: [], objectives: [], formulas: [], notes: [] });

/**
 * Search curriculum and the actor's own notes. Results are grouped, each with
 * a snippet, an href, a score and a plain-language reason; `best` merges the
 * top results across groups.
 */
export async function search(actor: Actor, query: string, options: SearchOptions = {}): Promise<SearchResponse> {
  if (!UUID.test(actor.id)) throw new DomainError("unauthenticated", "Sign in to search.");
  const q = z.string().max(300, "Search terms are too long.").safeParse(query);
  if (!q.success) throw new DomainError("invalid", q.error.issues[0]?.message ?? "Invalid search.");
  const opts = searchOptionsSchema.safeParse(options);
  if (!opts.success) throw new DomainError("invalid", opts.error.issues[0]?.message ?? "Invalid search options.");
  const { courseId, limit } = opts.data;

  const parsed = parseQuery(q.data);
  const response: SearchResponse = { query: q.data, terms: parsed.terms.filter((x) => x.weight === 1).map((x) => x.terms.join(" ")), ...EMPTY_GROUPS(), best: [] };
  if (parsed.originalCount === 0) return response;

  const [index, noteDocs] = await Promise.all([getIndex(), loadOwnNoteDocs(actor)]);
  const curriculum = index.docs.filter((d) => !courseId || d.courseId === courseId).map((d) => scoreDoc(d, parsed, index));
  applyRelationshipBoost(curriculum);
  const scored = [...curriculum, ...noteDocs.map((d) => scoreDoc(d, parsed, index))].filter((s) => s.score >= MIN_SCORE).sort((a, b) => b.score - a.score || a.doc.title.localeCompare(b.doc.title));

  for (const s of scored) {
    const list = response[s.doc.group];
    if (list.length < limit) list.push(toResult(s));
  }
  response.best = scored.slice(0, limit).map(toResult);
  return response;
}
