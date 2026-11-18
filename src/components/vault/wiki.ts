/**
 * Wiki-link → Markdown pre-processing for rendering notes with <Markdown>.
 * Pure (no React, no server imports): used by server pages and the editor.
 *
 *   const lookup = lookupFromLinks(note.links);
 *   <Markdown>{wikiToMarkdown(note.body, lookup)}</Markdown>
 *
 * Resolved note/skill links become ordinary Markdown links to the note page
 * or concept page; unresolved ones link to "create note" with the title
 * prefilled. Code spans/blocks are left untouched (parseWikiLinks masks them).
 */
import { normaliseTitle, parseWikiLinks, type WikiLink } from "@/modules/vault/links";

export type LinkKind = "note" | "skill" | "unresolved";

export interface LinkTarget {
  type: LinkKind;
  id: string;
  title: string;
  href: string | null;
}

export type LinkLookup = Map<string, LinkTarget>;

/** Minimal shape of the service's NoteLinkView (kept structural so client code needn't import the service). */
export interface StoredLink {
  targetType: LinkKind;
  targetId: string;
  label: string;
  title: string;
  href: string | null;
}

export const NEW_NOTE_PATH = "/app/vault/new";

export function newNoteHref(title: string, body?: string): string {
  const p = new URLSearchParams({ title });
  if (body) p.set("body", body);
  return `${NEW_NOTE_PATH}?${p.toString()}`;
}

/**
 * Build a lookup from a note's stored links. Keys: the target's current
 * title/name (normalised) and the label as written, so a link keeps resolving
 * after its target note is renamed.
 */
export function lookupFromLinks(links: readonly StoredLink[]): LinkLookup {
  const map: LinkLookup = new Map();
  for (const l of links) {
    const target: LinkTarget = { type: l.targetType, id: l.targetId, title: l.title, href: l.href };
    const keys =
      l.targetType === "unresolved"
        ? [l.targetId]
        : [normaliseTitle(l.title), normaliseTitle(l.label)];
    for (const k of keys)
      if (k && (!map.has(k) || map.get(k)!.type === "unresolved")) map.set(k, target);
  }
  return map;
}

/** Find what a parsed wiki link points at, or undefined if the lookup hasn't seen it yet. */
export function lookupLink(lookup: LinkLookup, link: WikiLink): LinkTarget | undefined {
  return lookup.get(link.key) ?? (link.alias ? undefined : lookup.get(normaliseTitle(link.target)));
}

const escapeLabel = (s: string) => s.replace(/([\\[\]])/g, "\\$1");
const escapeTitle = (s: string) => s.replace(/(["\\])/g, "\\$1");
const safeHref = (href: string) =>
  href.replace(/\(/g, "%28").replace(/\)/g, "%29").replace(/\s/g, "%20");

/** Replace `[[…]]` links with Markdown links. Links not in `lookup` are treated as unresolved. */
export function wikiToMarkdown(md: string, lookup: LinkLookup): string {
  const links = parseWikiLinks(md);
  if (links.length === 0) return md;
  let out = "";
  let pos = 0;
  for (const link of links) {
    out += md.slice(pos, link.index);
    const label = link.alias ?? link.target;
    const target = lookupLink(lookup, link);
    if (target && target.type !== "unresolved" && target.href) {
      const kind = target.type === "skill" ? "Concept" : "Note";
      out += `[${escapeLabel(label)}](${safeHref(target.href)} "${escapeTitle(`${kind}: ${target.title}`)}")`;
    } else {
      out += `[${escapeLabel(label)}](${safeHref(newNoteHref(link.target))} "${escapeTitle(`Not created yet — create note “${link.target}”`)}")`;
    }
    pos = link.index + link.length;
  }
  return out + md.slice(pos);
}

/** Replace `[[…]]` links with their plain display text (for readers who can't follow them, e.g. teachers). */
export function wikiToPlainMarkdown(md: string): string {
  const links = parseWikiLinks(md);
  if (links.length === 0) return md;
  let out = "";
  let pos = 0;
  for (const link of links) {
    out += md.slice(pos, link.index) + `**${escapeLabel(link.alias ?? link.target)}**`;
    pos = link.index + link.length;
  }
  return out + md.slice(pos);
}

/**
 * Tailwind classes for a <Markdown> wrapper that make wiki links readable at
 * a glance without relying on colour alone: concept links get a dotted
 * underline, unresolved ("create note") links are muted with a dashed one.
 */
export const WIKI_PROSE_CLASSES =
  "[&_a[href^='/app/vault/concepts/']]:decoration-dotted [&_a[href^='/app/vault/concepts/']]:decoration-2 [&_a[href^='/app/vault/new']]:text-muted [&_a[href^='/app/vault/new']]:decoration-dashed";
