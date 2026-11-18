/**
 * Right-hand panel for an open note (server component): the concepts it
 * links with the student's mastery, backlinks, outgoing links and recent
 * changes across the vault.
 */
import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowUpRight, FileText, PencilLine } from "lucide-react";
import { MasteryBadge, formatRelativeTime } from "@/components/ui";
import type { MasteryLevel } from "@/modules/mastery/types";
import { parseWikiLinks } from "@/modules/vault/links";
import { newNoteHref, type StoredLink } from "./wiki";

export interface ConnectionsBacklink {
  noteId: string;
  title: string;
  snippet: string;
  href: string;
}
export interface ConnectionsSkill {
  skillId: string;
  name: string;
  courseName: string;
  level: MasteryLevel;
  needsReview: boolean;
  href: string;
}
export interface RecentNote {
  id: string;
  title: string;
  updatedAt: Date | string;
}

function Panel({ title, count, children }: { title: string; count?: number; children: ReactNode }) {
  return (
    <section className="rounded-card border border-line bg-surface p-4 shadow-card">
      <h2 className="mb-3 flex items-center justify-between text-[0.8125rem] font-semibold uppercase tracking-wider text-muted">
        {title}
        {count !== undefined ? (
          <span className="rounded-md bg-sunken px-1.5 text-xs font-medium normal-case tracking-normal text-ink-2">
            {count}
          </span>
        ) : null}
      </h2>
      {children}
    </section>
  );
}

export function RecentChanges({ notes, currentId }: { notes: RecentNote[]; currentId?: string }) {
  return (
    <Panel title="Recent changes">
      {notes.length === 0 ? (
        <p className="text-sm text-muted">Nothing yet.</p>
      ) : (
        <ul className="space-y-2">
          {notes.map((n) => (
            <li key={n.id} className="flex items-baseline justify-between gap-3 text-sm">
              <Link
                href={`/app/vault?note=${n.id}`}
                aria-current={n.id === currentId ? "true" : undefined}
                className="min-w-0 truncate text-ink-2 hover:text-ink hover:underline underline-offset-4 aria-[current=true]:font-semibold aria-[current=true]:text-ink"
              >
                {n.title}
              </Link>
              <span className="shrink-0 text-xs text-faint">{formatRelativeTime(n.updatedAt)}</span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

export function NoteConnections({
  body,
  links,
  backlinks,
  skills,
}: {
  body: string;
  links: StoredLink[];
  backlinks: ConnectionsBacklink[];
  skills: ConnectionsSkill[];
}) {
  const noteLinks = links.filter((l) => l.targetType === "note");
  // Unresolved links are stored by normalised key; recover the target as written for "Create".
  const written = parseWikiLinks(body);
  const unresolved = links
    .filter((l) => l.targetType === "unresolved")
    .map((l) => ({ ...l, title: written.find((w) => w.key === l.targetId)?.target ?? l.title }));
  return (
    <div className="space-y-4">
      <Panel title="Linked concepts" count={skills.length}>
        {skills.length === 0 ? (
          <p className="text-sm leading-relaxed text-muted">
            Link a curriculum concept with{" "}
            <code className="rounded bg-sunken px-1 font-mono text-xs">[[Concept name]]</code> to
            see your mastery here.
          </p>
        ) : (
          <ul className="space-y-3">
            {skills.map((s) => (
              <li key={s.skillId}>
                <Link
                  href={s.href}
                  className="text-sm font-medium text-ink hover:underline underline-offset-4"
                >
                  {s.name}
                </Link>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <MasteryBadge level={s.level} needsReview={s.needsReview} size="sm" />
                  <span className="text-xs text-muted">{s.courseName}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Backlinks" count={backlinks.length}>
        {backlinks.length === 0 ? (
          <p className="text-sm text-muted">No other note links here yet.</p>
        ) : (
          <ul className="space-y-3">
            {backlinks.map((b) => (
              <li key={b.noteId}>
                <Link
                  href={`/app/vault?note=${b.noteId}`}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-ink hover:underline underline-offset-4"
                >
                  <FileText aria-hidden="true" className="size-3.5 text-muted" />
                  {b.title}
                </Link>
                <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted">
                  {b.snippet}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Outgoing links" count={noteLinks.length + unresolved.length}>
        {noteLinks.length + unresolved.length === 0 ? (
          <p className="text-sm text-muted">This note doesn&apos;t link to other notes.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {noteLinks.map((l) => (
              <li key={`n-${l.targetId}`}>
                <Link
                  href={`/app/vault?note=${l.targetId}`}
                  className="inline-flex items-center gap-1.5 text-ink hover:underline underline-offset-4"
                >
                  <ArrowUpRight aria-hidden="true" className="size-3.5 text-muted" />
                  {l.title}
                </Link>
              </li>
            ))}
            {unresolved.map((l) => (
              <li key={`u-${l.targetId}`} className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate text-muted">
                  {l.title} <span className="text-xs">(not created)</span>
                </span>
                <Link
                  href={newNoteHref(l.title)}
                  className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-accent hover:underline underline-offset-4"
                >
                  <PencilLine aria-hidden="true" className="size-3" />
                  Create<span className="sr-only"> note “{l.title}”</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
