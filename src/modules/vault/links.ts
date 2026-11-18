/**
 * Pure Markdown helpers for the Knowledge Vault. No database or framework
 * imports, so they run identically on the server, in tests and in the browser.
 *
 *  - `[[Target]]` and `[[Target|Alias]]` wiki links (an optional `#heading` or
 *    `^block` suffix on the target is ignored for matching)
 *  - `#tags` (a `#` followed immediately by a letter; Markdown headings such
 *    as `# Title` are not tags)
 *  - Anything inside inline code spans or fenced code blocks is ignored.
 */

export interface WikiLink {
  /** Target as written, with any `#heading` / `^block` suffix removed. */
  target: string;
  /** Display text after `|`, if any. */
  alias: string | null;
  /** `normaliseTitle(target)` — the key used for matching. */
  key: string;
  /** Offset of `[[` in the original Markdown. */
  index: number;
  /** Length of the whole `[[…]]` token. */
  length: number;
}

export const MAX_TAGS = 20;
export const MAX_TAG_LENGTH = 50;

/**
 * Replace fenced code blocks and inline code spans with spaces of the same
 * length, so offsets into the result still line up with the original text.
 */
export function maskCode(md: string): string {
  const blank = (s: string) => s.replace(/[^\n]/g, " ");
  // Fenced blocks: a line opening with ``` or ~~~ (3+) up to a line closing with
  // the same fence character and at least as many of them (or end of text).
  const lines = md.split("\n");
  let fence: { char: string; size: number } | null = null;
  for (let i = 0; i < lines.length; i++) {
    const m = /^[ \t]{0,3}(`{3,}|~{3,})/.exec(lines[i]);
    if (fence) {
      if (m && m[1][0] === fence.char && m[1].length >= fence.size && lines[i].trim() === m[1].trim()) fence = null;
      lines[i] = blank(lines[i]);
    } else if (m) {
      fence = { char: m[1][0], size: m[1].length };
      lines[i] = blank(lines[i]);
    }
  }
  // Inline code spans: a run of N backticks closed by a run of exactly N.
  return lines.join("\n").replace(/(?<!`)(`+)(?!`)([\s\S]*?[^`])\1(?!`)/g, (m) => blank(m));
}

const WIKI_LINK = /\[\[([^[\]|\n]+?)(?:\|([^[\]\n]*?))?\]\]/g;

/** Case-, width- and whitespace-insensitive key for matching titles and names. */
export function normaliseTitle(title: string): string {
  return title.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
}

/** Tidy a user-entered title for storage: trimmed, single spaces. */
export function cleanTitle(title: string): string {
  return title.normalize("NFKC").trim().replace(/\s+/g, " ");
}

/** All wiki links in document order (duplicates included). */
export function parseWikiLinks(md: string): WikiLink[] {
  const masked = maskCode(md);
  const links: WikiLink[] = [];
  for (const m of masked.matchAll(WIKI_LINK)) {
    const index = m.index ?? 0;
    // Read from the original text (masking only blanks code, so offsets match).
    const raw = md.slice(index, index + m[0].length);
    const inner = raw.slice(2, -2);
    const bar = inner.indexOf("|");
    const targetRaw = bar >= 0 ? inner.slice(0, bar) : inner;
    const aliasRaw = bar >= 0 ? inner.slice(bar + 1) : null;
    const target = cleanTitle(targetRaw.replace(/[#^].*$/, ""));
    if (!target) continue;
    const alias = aliasRaw !== null && aliasRaw.trim() ? aliasRaw.trim() : null;
    links.push({ target, alias, key: normaliseTitle(target), index, length: m[0].length });
  }
  return links;
}

/** Wiki links de-duplicated by match key, first occurrence wins. */
export function uniqueWikiLinks(md: string): WikiLink[] {
  const seen = new Set<string>();
  return parseWikiLinks(md).filter((l) => (seen.has(l.key) ? false : (seen.add(l.key), true)));
}

/** Normalise one tag: lowercase, no leading `#`, only letters/digits/`-`/`_`/`/`. Returns null if unusable. */
export function normaliseTag(tag: string): string | null {
  const t = tag
    .normalize("NFKC")
    .trim()
    .replace(/^#+/, "")
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\p{L}\p{N}_/-]/gu, "")
    .slice(0, MAX_TAG_LENGTH);
  return t && /\p{L}/u.test(t[0]) ? t : null;
}

/** `#tags` in the body (outside code and wiki links), normalised, in order of first appearance. */
export function parseTags(md: string): string[] {
  const masked = maskCode(md).replace(WIKI_LINK, (m) => " ".repeat(m.length));
  const out: string[] = [];
  for (const m of masked.matchAll(/(^|[\s(,;])#(\p{L}[\p{L}\p{N}_/-]*)/gu)) {
    const tag = normaliseTag(m[2]);
    if (tag) out.push(tag);
  }
  return out;
}

/** Union of explicit tags and body `#tags`: normalised, de-duplicated, at most MAX_TAGS. */
export function mergeTags(explicit: readonly string[], body: string): string[] {
  const out: string[] = [];
  for (const raw of [...explicit, ...parseTags(body)]) {
    const tag = normaliseTag(raw);
    if (tag && !out.includes(tag)) out.push(tag);
    if (out.length >= MAX_TAGS) break;
  }
  return out;
}

/** URL- and filename-safe slug (ASCII, lowercase, hyphenated). Never empty. */
export function slugify(text: string, maxLength = 80): string {
  const slug = text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLength)
    .replace(/-+$/g, "");
  return slug || "note";
}

/** A one-line plain-text excerpt of `text` around [index, index+length). */
export function snippetAround(text: string, index: number, length: number, radius = 60): string {
  const start = Math.max(0, index - radius);
  const end = Math.min(text.length, index + length + radius);
  const body = text.slice(start, end).replace(/\s+/g, " ").trim();
  return `${start > 0 ? "…" : ""}${body}${end < text.length ? "…" : ""}`;
}

/** Plain-text preview of a Markdown body (code, link brackets and emphasis markers removed). */
export function plainExcerpt(md: string, max = 200): string {
  const text = maskCode(md)
    .replace(WIKI_LINK, (_m, target: string, alias?: string) => (alias && alias.trim() ? alias : target))
    .replace(/[*_>#`~]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}
