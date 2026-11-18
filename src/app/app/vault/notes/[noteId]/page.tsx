/**
 * /app/vault/notes/[noteId] — edit one of the student's notes.
 * Backlinks below the editor are as of page load.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FileText } from "lucide-react";
import { PageHeader } from "@/components/ui";
import { NoteEditor } from "@/components/vault/NoteEditor";
import { DomainError } from "@/lib/errors";
import { requireStudent } from "@/modules/auth/session";
import { parseTags } from "@/modules/vault/links";
import { getBacklinks, getNote, listNotes, listTags, type NoteView } from "@/modules/vault/service";

export const metadata: Metadata = { title: "Edit note" };

export default async function NotePage({ params }: { params: Promise<{ noteId: string }> }) {
  const user = await requireStudent();
  const { noteId } = await params;
  let note: NoteView;
  try {
    note = await getNote(user, noteId);
  } catch (e) {
    if (e instanceof DomainError && (e.code === "not_found" || e.code === "forbidden")) notFound();
    throw e;
  }
  const [backlinks, all, tags] = await Promise.all([
    getBacklinks(user, { type: "note", id: note.id }),
    listNotes(user, { limit: 200 }),
    listTags(user),
  ]);
  const folders = [...new Set(all.map((n) => n.folder).filter(Boolean))].sort();
  // Stored tags = explicit ∪ #tags in the body; the editor edits the explicit part.
  const bodyTags = new Set(parseTags(note.body));
  const explicit = note.tags.filter((t) => !bodyTags.has(t));

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Knowledge vault", href: "/app/vault" }, { label: note.title }]}
        title="Edit note"
        className="mb-5"
      />
      <NoteEditor
        initial={{
          id: note.id,
          title: note.title,
          body: note.body,
          tags: explicit,
          folder: note.folder,
          links: note.links,
          updatedAt: note.updatedAt.toISOString(),
        }}
        folders={folders}
        knownTags={tags.map((t) => t.tag)}
      />
      <section aria-labelledby="backlinks-title" className="mt-8">
        <h2 id="backlinks-title" className="mb-3 font-display text-lg font-semibold text-ink">
          Backlinks <span className="font-normal text-muted">({backlinks.length})</span>
        </h2>
        {backlinks.length === 0 ? (
          <p className="text-sm text-muted">
            No other note links here yet. Link to it from another note with [[{note.title}]].
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {backlinks.map((b) => (
              <li
                key={b.noteId}
                className="rounded-card border border-line bg-surface p-4 shadow-card"
              >
                <Link
                  href={b.href}
                  className="inline-flex items-center gap-1.5 font-medium text-ink hover:underline underline-offset-4"
                >
                  <FileText aria-hidden="true" className="size-4 text-muted" />
                  {b.title}
                </Link>
                <p className="mt-1 line-clamp-3 text-sm leading-relaxed text-muted">{b.snippet}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
