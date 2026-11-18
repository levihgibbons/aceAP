/**
 * /app/vault/new?title=&body=&folder= — start a note. Nothing is saved until
 * the student writes or presses Ctrl/Cmd+S (no empty notes from a click).
 */
import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { NoteEditor } from "@/components/vault/NoteEditor";
import { requireStudent } from "@/modules/auth/session";
import { cleanTitle } from "@/modules/vault/links";
import { listNotes, listTags } from "@/modules/vault/service";

export const metadata: Metadata = { title: "New note" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function NewNotePage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireStudent();
  const sp = await searchParams;
  const title = cleanTitle(one(sp.title) ?? "")
    .replace(/[[\]|#^]/g, "")
    .slice(0, 200);
  const body = (one(sp.body) ?? "").slice(0, 5000);
  const folder = (one(sp.folder) ?? "").slice(0, 200);
  const [all, tags] = await Promise.all([listNotes(user, { limit: 200 }), listTags(user)]);
  const folders = [...new Set(all.map((n) => n.folder).filter(Boolean))].sort();

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Knowledge vault", href: "/app/vault" }, { label: "New note" }]}
        title="New note"
        className="mb-5"
      />
      <NoteEditor
        initial={{ id: null, title, body, tags: [], folder, links: [], updatedAt: null }}
        folders={folders}
        knownTags={tags.map((t) => t.tag)}
      />
    </>
  );
}
