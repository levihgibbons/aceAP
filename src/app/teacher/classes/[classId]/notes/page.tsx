/**
 * /teacher/classes/[classId]/notes — notes students explicitly shared with
 * this class. Only the class teacher can see them (enforced by the vault
 * service and row-level security); nothing else from students' vaults appears.
 */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FileText, Lock } from "lucide-react";
import { Markdown } from "@/components/content/Markdown";
import {
  Card,
  EmptyState,
  ErrorState,
  PageHeader,
  Pill,
  formatDate,
  formatRelativeTime,
} from "@/components/ui";
import { wikiToPlainMarkdown } from "@/components/vault/wiki";
import { DomainError } from "@/lib/errors";
import { requireStaff } from "@/modules/auth/session";
import { listSharedNotesForClass, type SharedNoteForTeacher } from "@/modules/vault/service";
import { getClassHeader } from "../../../../api/vault/_lib/queries";

export const metadata: Metadata = { title: "Shared notes" };

export default async function SharedNotesPage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const user = await requireStaff();
  const { classId } = await params;

  let notes: SharedNoteForTeacher[];
  try {
    notes = await listSharedNotesForClass(user, classId);
  } catch (e) {
    if (e instanceof DomainError && e.code === "not_found") notFound();
    if (e instanceof DomainError && e.code === "forbidden") {
      return (
        <>
          <PageHeader
            breadcrumbs={[
              { label: "Classes", href: "/teacher/classes" },
              { label: "Shared notes" },
            ]}
            title="Shared notes"
          />
          <ErrorState
            title="Not available"
            description={e.message}
            retry={{ href: "/teacher/classes", label: "Back to classes" }}
          />
        </>
      );
    }
    throw e;
  }
  const cls = await getClassHeader(classId);

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Classes", href: "/teacher/classes" },
          { label: cls?.name ?? "Class", href: `/teacher/classes/${classId}` },
          { label: "Shared notes" },
        ]}
        eyebrow={cls?.courseName}
        title="Shared notes"
        description={
          <span className="inline-flex items-start gap-1.5">
            <Lock aria-hidden="true" className="mt-1 size-3.5 shrink-0" />
            Students&apos; vaults are private. Only notes a student explicitly shared with this
            class appear here, and they disappear if the student stops sharing.
          </span>
        }
      />
      {notes.length === 0 ? (
        <EmptyState
          icon={<FileText />}
          title="No shared notes yet"
          description="When a student shares a note with this class from their Knowledge vault, it shows up here."
        />
      ) : (
        <ul className="space-y-4">
          {notes.map((n) => (
            <li key={n.noteId}>
              <Card as="article" aria-labelledby={`note-${n.noteId}`}>
                <header className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2
                      id={`note-${n.noteId}`}
                      className="font-display text-lg font-semibold text-ink"
                    >
                      {n.title}
                    </h2>
                    <p className="mt-0.5 text-sm text-muted">
                      {n.authorName} · shared {formatDate(n.sharedAt, { short: true })} · edited{" "}
                      {formatRelativeTime(n.updatedAt)}
                    </p>
                  </div>
                  {n.tags.length ? (
                    <ul className="flex flex-wrap gap-1.5" aria-label="Tags">
                      {n.tags.map((t) => (
                        <li key={t}>
                          <Pill>#{t}</Pill>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </header>
                <div className="mt-4 border-t border-line pt-4">
                  {n.body.trim() ? (
                    <Markdown compact>{wikiToPlainMarkdown(n.body)}</Markdown>
                  ) : (
                    <p className="text-sm text-muted">This note is empty.</p>
                  )}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
