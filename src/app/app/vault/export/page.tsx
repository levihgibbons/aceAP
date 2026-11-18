/**
 * /app/vault/export — download the vault as JSON (versioned schema) or Markdown.
 */
import type { Metadata } from "next";
import { Braces, Check, Download, FileText, Minus } from "lucide-react";
import { Badge, Card, PageHeader, Section, buttonStyles } from "@/components/ui";
import { VaultNav } from "@/components/vault/VaultNav";
import { requireStudent } from "@/modules/auth/session";
import {
  VAULT_EXPORT_LICENSING_NOTE,
  VAULT_EXPORT_SCHEMA,
  VAULT_EXPORT_SCHEMA_VERSION,
  listNotes,
} from "@/modules/vault/service";

export const metadata: Metadata = { title: "Export your vault" };

const INCLUDED = [
  "Every note: title, text, tags, folder, created and updated dates",
  "Your links between notes and to concepts (resolved and not-yet-created)",
  "The concepts you link to or have practised, with their course",
  "How those concepts connect (prerequisites and related concepts, with explanations)",
  "Your mastery level on each concept, with a short evidence summary",
  "Your mastery history (up to the last 1,000 changes) and the misconceptions noticed in your answers",
];

const EXCLUDED = [
  "Question text, answer choices and answer keys",
  "Other people's data — classmates, teachers, or notes shared with you",
  "Your email address and account details",
  "Lesson content (referenced by id only)",
];

export default async function VaultExportPage() {
  const user = await requireStudent();
  const notes = await listNotes(user, { limit: 200 });
  const count = notes.length >= 200 ? "200+" : String(notes.length);

  return (
    <>
      <PageHeader
        title="Export your vault"
        description="Take your notes and your learning record with you. Downloads are generated fresh each time and aren't stored."
      />
      <VaultNav current="export" />

      <div className="grid gap-4 sm:grid-cols-2">
        <Card as="section" aria-labelledby="json-title">
          <span
            aria-hidden="true"
            className="mb-3 inline-flex size-10 items-center justify-center rounded-xl bg-accent-soft text-accent-ink"
          >
            <Braces className="size-5" />
          </span>
          <h2 id="json-title" className="font-display text-lg font-semibold text-ink">
            JSON
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            Complete and machine-readable — the format a future import will read.
          </p>
          <p className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted">
            <Badge tone="neutral">
              {VAULT_EXPORT_SCHEMA} v{VAULT_EXPORT_SCHEMA_VERSION}
            </Badge>
            <span>{count} notes</span>
          </p>
          <a
            href="/api/vault/export?format=json"
            download
            className={buttonStyles({ variant: "primary", className: "mt-5" })}
          >
            <Download aria-hidden="true" className="size-4" />
            Download JSON
          </a>
        </Card>
        <Card as="section" aria-labelledby="md-title">
          <span
            aria-hidden="true"
            className="mb-3 inline-flex size-10 items-center justify-center rounded-xl bg-sunken text-ink-2"
          >
            <FileText className="size-5" />
          </span>
          <h2 id="md-title" className="font-display text-lg font-semibold text-ink">
            Markdown
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            One readable file: each note with its front matter, plus a mastery summary table. Opens
            in any notes app.
          </p>
          <p className="mt-3 text-xs text-muted">{count} notes</p>
          <a
            href="/api/vault/export?format=markdown"
            download
            className={buttonStyles({ variant: "secondary", className: "mt-5" })}
          >
            <Download aria-hidden="true" className="size-4" />
            Download Markdown
          </a>
        </Card>
      </div>

      <div className="mt-2 grid gap-x-8 sm:grid-cols-2">
        <Section title="What's included">
          <ul className="space-y-2 text-sm text-ink-2">
            {INCLUDED.map((t) => (
              <li key={t} className="flex gap-2">
                <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-good" />
                {t}
              </li>
            ))}
          </ul>
        </Section>
        <Section title="What isn't">
          <ul className="space-y-2 text-sm text-ink-2">
            {EXCLUDED.map((t) => (
              <li key={t} className="flex gap-2">
                <Minus aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted" />
                {t}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs leading-relaxed text-muted">{VAULT_EXPORT_LICENSING_NOTE}</p>
        </Section>
      </div>

      <Section title="About the format">
        <div className="max-w-prose space-y-2 text-sm leading-relaxed text-ink-2">
          <p>
            The JSON file follows schema{" "}
            <code className="font-mono text-[0.8125rem]">{VAULT_EXPORT_SCHEMA}</code> version{" "}
            {VAULT_EXPORT_SCHEMA_VERSION}. Versions are semantic: a 1.x importer accepts any 1.y.z
            file, and newer minor versions only add optional fields. Dates are ISO-8601.
          </p>
          <p className="text-muted">
            Importing an export back into AceAP is planned; keep your JSON file — it&apos;s the
            format the importer will read.
          </p>
        </div>
      </Section>
    </>
  );
}
