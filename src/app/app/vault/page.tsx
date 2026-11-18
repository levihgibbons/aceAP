/**
 * /app/vault — the Knowledge Vault workspace: search, tags, folders and the
 * note list; the open note (?note=<id>); and its connections.
 * Filters are URL state (?q=, ?tag=, ?folder=), so they work without JavaScript.
 */
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { FileText, Folder, Lock, Network, PencilLine, Plus, Search, Tag, X } from "lucide-react";
import { Markdown } from "@/components/content/Markdown";
import {
  Badge,
  ButtonLink,
  EmptyState,
  PageHeader,
  Pill,
  formatDate,
  formatRelativeTime,
} from "@/components/ui";
import { NoteConnections, RecentChanges } from "@/components/vault/NoteConnections";
import { ShareButton } from "@/components/vault/ShareDialog";
import { VaultNav } from "@/components/vault/VaultNav";
import { VaultWorkspace } from "@/components/vault/VaultWorkspace";
import { WIKI_PROSE_CLASSES, lookupFromLinks, wikiToMarkdown } from "@/components/vault/wiki";
import { DomainError } from "@/lib/errors";
import { cn } from "@/lib/cn";
import { requireStudent } from "@/modules/auth/session";
import { getBacklinks, getNote, listNotes, listTags, type NoteView } from "@/modules/vault/service";
import { getSkillLevels } from "../../api/vault/_lib/queries";

export const metadata: Metadata = { title: "Knowledge vault" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function VaultPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireStudent();
  const sp = await searchParams;
  const q = one(sp.q)?.trim().slice(0, 200) || undefined;
  const tag = one(sp.tag) || undefined;
  const folder = one(sp.folder);
  const noteId = one(sp.note);

  const filtering = Boolean(q || tag || folder !== undefined);
  const [all, tags] = await Promise.all([listNotes(user, { limit: 200 }), listTags(user)]);
  const notes = filtering ? await listNotes(user, { query: q, tag, folder, limit: 200 }) : all;

  let note: NoteView | null = null;
  let missing = false;
  if (noteId) {
    try {
      note = await getNote(user, noteId);
    } catch (e) {
      if (e instanceof DomainError && e.code === "not_found") missing = true;
      else throw e;
    }
  }
  const [backlinks, skills] = note
    ? await Promise.all([
        getBacklinks(user, { type: "note", id: note.id }),
        getSkillLevels(
          user,
          note.links.filter((l) => l.targetType === "skill").map((l) => l.targetId),
        ),
      ])
    : [[], []];

  // Folder list with counts (each folder counts notes in it and below it).
  const folderCounts = new Map<string, number>();
  for (const n of all) {
    if (!n.folder) continue;
    const parts = n.folder.split("/");
    for (let i = 1; i <= parts.length; i++) {
      const path = parts.slice(0, i).join("/");
      folderCounts.set(path, (folderCounts.get(path) ?? 0) + 1);
    }
  }
  const folders = [...folderCounts].sort((a, b) => a[0].localeCompare(b[0]));

  const href = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const base = { q, tag, folder, note: note?.id, ...patch };
    for (const [k, v] of Object.entries(base)) if (v !== undefined) p.set(k, v);
    const s = p.toString();
    return s ? `/app/vault?${s}` : "/app/vault";
  };

  const sidebar = (
    <div className="space-y-5">
      <form action="/app/vault" method="get" role="search" className="relative">
        <label htmlFor="vault-search" className="sr-only">
          Search notes
        </label>
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint"
        />
        <input
          id="vault-search"
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Search titles and text"
          className="h-10 w-full rounded-lg border border-line-strong bg-surface pl-9 pr-3 text-sm text-ink shadow-card placeholder:text-faint focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-accent"
        />
        {tag ? <input type="hidden" name="tag" value={tag} /> : null}
        {folder !== undefined ? <input type="hidden" name="folder" value={folder} /> : null}
        {note ? <input type="hidden" name="note" value={note.id} /> : null}
      </form>

      {filtering ? (
        <div className="flex flex-wrap items-center gap-1.5" aria-label="Active filters">
          {q ? <FilterChip label={`“${q}”`} href={href({ q: undefined })} what="search" /> : null}
          {tag ? (
            <FilterChip label={`#${tag}`} href={href({ tag: undefined })} what="tag filter" />
          ) : null}
          {folder !== undefined ? (
            <FilterChip
              label={folder || "No folder"}
              href={href({ folder: undefined })}
              what="folder filter"
            />
          ) : null}
        </div>
      ) : null}

      {folders.length ? (
        <div>
          <h2 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted">
            Folders
          </h2>
          <ul className="space-y-0.5 text-sm">
            <li>
              <SideLink
                href={href({ folder: undefined })}
                active={folder === undefined}
                icon={<FileText className="size-3.5" />}
                label="All notes"
                count={all.length}
              />
            </li>
            {folders.map(([path, count]) => {
              const depth = path.split("/").length - 1;
              return (
                <li key={path} style={{ paddingLeft: `${depth * 0.75}rem` }}>
                  <SideLink
                    href={href({ folder: path })}
                    active={folder === path}
                    icon={<Folder className="size-3.5" />}
                    label={path.split("/").pop() ?? path}
                    count={count}
                  />
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {tags.length ? (
        <div>
          <h2 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted">Tags</h2>
          <ul className="flex flex-wrap gap-1.5">
            {tags.slice(0, 30).map((t) => (
              <li key={t.tag}>
                <Link
                  href={href({ tag: tag === t.tag ? undefined : t.tag })}
                  aria-current={tag === t.tag ? "true" : undefined}
                  className="inline-flex items-center gap-1 rounded-md border border-line bg-surface px-2 py-0.5 text-xs font-medium text-ink-2 hover:border-line-strong aria-[current=true]:border-accent aria-[current=true]:bg-accent-soft aria-[current=true]:text-accent-ink"
                >
                  <Tag aria-hidden="true" className="size-3" />
                  {t.tag}
                  <span className="text-faint">{t.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div>
        <h2 className="mb-1.5 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted">
          {filtering ? "Matching notes" : "Notes"}
          <span className="font-medium normal-case tracking-normal">{notes.length}</span>
        </h2>
        {all.length === 0 ? (
          <p className="text-sm text-muted">No notes yet.</p>
        ) : notes.length === 0 ? (
          <p className="text-sm text-muted">
            No notes match.{" "}
            <Link href="/app/vault" className="text-accent hover:underline underline-offset-4">
              Clear filters
            </Link>
          </p>
        ) : (
          <ul className="-mx-1 space-y-0.5">
            {notes.map((n) => (
              <li key={n.id}>
                <Link
                  href={href({ note: n.id })}
                  aria-current={note?.id === n.id ? "page" : undefined}
                  className="block rounded-lg px-2.5 py-2 hover:bg-surface aria-[current=page]:bg-accent-soft"
                >
                  <span className="block truncate text-sm font-medium text-ink">{n.title}</span>
                  {n.excerpt ? (
                    <span className="mt-0.5 line-clamp-2 block text-xs leading-relaxed text-muted">
                      {n.excerpt}
                    </span>
                  ) : null}
                  <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[0.6875rem] text-faint">
                    <span>{formatRelativeTime(n.updatedAt)}</span>
                    {n.tags.slice(0, 3).map((t) => (
                      <span key={t}>#{t}</span>
                    ))}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );

  const main = note ? (
    <article
      aria-labelledby="note-title"
      className="rounded-card border border-line bg-surface shadow-card"
    >
      <header className="flex flex-col gap-3 border-b border-line px-5 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-7 sm:py-5">
        <div className="min-w-0">
          <h2
            id="note-title"
            className="font-display text-[1.5rem] font-semibold leading-tight tracking-[-0.015em] text-ink text-balance"
          >
            {note.title}
          </h2>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
            {note.folder ? (
              <span className="inline-flex items-center gap-1">
                <Folder aria-hidden="true" className="size-3.5" />
                {note.folder}
              </span>
            ) : null}
            <span>Updated {formatDate(note.updatedAt, { withTime: true, short: true })}</span>
            <span className="inline-flex items-center gap-1">
              <Lock aria-hidden="true" className="size-3" /> Private unless shared
            </span>
          </p>
          {note.tags.length ? (
            <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Tags">
              {note.tags.map((t) => (
                <li key={t}>
                  <Link href={href({ tag: t, note: note.id })}>
                    <Pill>#{t}</Pill>
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <ButtonLink
            href={note.href}
            size="sm"
            icon={<PencilLine aria-hidden="true" className="size-4" />}
          >
            Edit
          </ButtonLink>
          <ShareButton noteId={note.id} noteTitle={note.title} />
        </div>
      </header>
      <div className="px-5 py-5 sm:px-7 sm:py-6">
        {note.body.trim() ? (
          <Markdown className={WIKI_PROSE_CLASSES}>
            {wikiToMarkdown(note.body, lookupFromLinks(note.links))}
          </Markdown>
        ) : (
          <p className="text-sm text-muted">
            This note is empty.{" "}
            <Link href={note.href} className="text-accent hover:underline underline-offset-4">
              Start writing
            </Link>
          </p>
        )}
      </div>
    </article>
  ) : (
    <div className="space-y-4">
      {missing ? (
        <div
          role="alert"
          className="rounded-card border border-warn/30 bg-warn-soft px-4 py-3 text-sm text-warn"
        >
          That note doesn&apos;t exist or isn&apos;t yours. It may have been deleted.
        </div>
      ) : null}
      {all.length === 0 ? (
        <EmptyState
          icon={<Lock />}
          title="Your vault is private"
          description={
            <>
              Notes you write here stay yours; teachers can&apos;t see them unless you share a note
              with a class. Link ideas with <code className="font-mono">[[double brackets]]</code> —
              link a concept like{" "}
              <code className="font-mono">[[Chain rule: powers of functions]]</code> and your
              mastery shows up beside the note.
            </>
          }
          action={
            <ButtonLink href="/app/vault/new" icon={<Plus aria-hidden="true" className="size-4" />}>
              Write your first note
            </ButtonLink>
          }
        />
      ) : (
        <div className="rounded-card border border-line bg-surface p-6 shadow-card sm:p-8">
          <span
            aria-hidden="true"
            className="mb-4 inline-flex size-11 items-center justify-center rounded-xl bg-accent-soft text-accent-ink"
          >
            <Lock className="size-5" />
          </span>
          <h2 className="font-display text-xl font-semibold text-ink">Your vault is private</h2>
          <p className="mt-2 max-w-prose text-[0.9375rem] leading-relaxed text-muted">
            Notes you write here stay yours; teachers can&apos;t see them unless you share a note
            with a class. Pick a note on the left, or start a new one.
          </p>
          <ul className="mt-5 grid gap-3 text-sm text-ink-2 sm:grid-cols-3">
            <li className="rounded-lg border border-line bg-surface-2 p-3">
              <p className="font-medium text-ink">Link ideas</p>
              <p className="mt-1 text-muted">
                Type <code className="font-mono">[[</code> to link a note or a concept.
              </p>
            </li>
            <li className="rounded-lg border border-line bg-surface-2 p-3">
              <p className="font-medium text-ink">See mastery</p>
              <p className="mt-1 text-muted">Linked concepts show your current level.</p>
            </li>
            <li className="rounded-lg border border-line bg-surface-2 p-3">
              <p className="font-medium text-ink">Write math</p>
              <p className="mt-1 text-muted">
                <code className="font-mono">$x^2$</code> inline,{" "}
                <code className="font-mono">$$…$$</code> display.
              </p>
            </li>
          </ul>
          <div className="mt-6 flex flex-wrap gap-2">
            <ButtonLink href="/app/vault/new" icon={<Plus aria-hidden="true" className="size-4" />}>
              New note
            </ButtonLink>
            <ButtonLink
              href="/app/vault/graph"
              variant="secondary"
              icon={<Network aria-hidden="true" className="size-4" />}
            >
              Open the graph
            </ButtonLink>
          </div>
        </div>
      )}
    </div>
  );

  const recent = all.slice(0, 6).map((n) => ({ id: n.id, title: n.title, updatedAt: n.updatedAt }));
  const aside = (
    <div className="space-y-4">
      {note ? (
        <NoteConnections
          body={note.body}
          links={note.links}
          backlinks={backlinks.map((b) => ({
            noteId: b.noteId,
            title: b.title,
            snippet: b.snippet,
            href: b.href,
          }))}
          skills={skills}
        />
      ) : null}
      <RecentChanges notes={recent} currentId={note?.id} />
    </div>
  );

  return (
    <>
      <PageHeader
        title="Knowledge vault"
        description="Your private, linked notes — connected to what you're learning."
        actions={
          <ButtonLink href="/app/vault/new" icon={<Plus aria-hidden="true" className="size-4" />}>
            New note
          </ButtonLink>
        }
      />
      <VaultNav current="notes" />
      <VaultWorkspace
        sidebar={sidebar}
        main={main}
        aside={aside}
        hasNote={Boolean(note)}
        noteCount={all.length}
      />
      {all.length >= 200 ? (
        <p className="mt-4 text-xs text-muted">
          <Badge tone="info">Note</Badge> The list shows your 200 most recently updated notes. Use
          search to find older ones.
        </p>
      ) : null}
    </>
  );
}

function FilterChip({ label, href, what }: { label: string; href: string; what: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-2 py-0.5 text-xs font-medium text-ink-2 hover:border-line-strong"
    >
      {label}
      <X aria-hidden="true" className="size-3" />
      <span className="sr-only">Remove {what}</span>
    </Link>
  );
}

function SideLink({
  href,
  active,
  icon,
  label,
  count,
}: {
  href: string;
  active: boolean;
  icon: ReactNode;
  label: string;
  count: number;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={cn(
        "flex items-center gap-2 rounded-md px-2 py-1 text-ink-2 hover:bg-surface hover:text-ink",
        active && "bg-accent-soft font-medium text-accent-ink",
      )}
    >
      <span aria-hidden="true" className="text-muted">
        {icon}
      </span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <span className="text-xs text-faint">{count}</span>
    </Link>
  );
}
