/**
 * /dev/outbox — development email outbox. Lists messages the "outbox" email
 * adapter stored instead of delivering, so a developer can click reset links.
 *
 * Available only when:
 *  - NODE_ENV !== "production" and the viewer is a platform admin, or
 *  - ACEAP_DEV_OUTBOX=1 (automated end-to-end tests only — it exposes every
 *    stored message to anyone; never set it on a real deployment).
 * Everyone else gets a 404.
 */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Inbox, TriangleAlert } from "lucide-react";
import { EmptyState, PageHeader, formatRelativeTime } from "@/components/ui";
import { getCurrentUser } from "@/modules/auth/session";
import { listOutbox } from "@/modules/notifications/email";

export const metadata: Metadata = {
  title: "Dev email outbox",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

const URL_PATTERN = /(https?:\/\/[^\s<>"']+)/g;

function Linkified({ text }: { text: string }) {
  const parts = text.split(URL_PATTERN);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <a
            key={i}
            href={part}
            className="break-all font-medium text-accent underline underline-offset-4"
          >
            {part}
          </a>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

async function allowed(): Promise<boolean> {
  if (process.env.ACEAP_DEV_OUTBOX === "1") return true;
  if (process.env.NODE_ENV === "production") return false;
  const user = await getCurrentUser();
  return user?.role === "platform_admin";
}

export default async function DevOutboxPage() {
  await connection();
  if (!(await allowed())) notFound();
  const messages = await listOutbox(50);

  return (
    <main id="main" className="mx-auto w-full max-w-3xl px-4 py-10">
      <PageHeader
        eyebrow="Development"
        title="Email outbox"
        description="Messages the development email adapter stored instead of sending. Newest first; the 50 most recent."
      />
      <p
        role="note"
        className="mb-6 flex items-start gap-2.5 rounded-lg border border-warn/25 bg-warn-soft px-3.5 py-3 text-sm text-warn"
      >
        <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        Nothing here was delivered. This page exists only for local development and automated tests.
      </p>
      {messages.length === 0 ? (
        <EmptyState
          icon={<Inbox className="size-6" aria-hidden />}
          title="No messages yet"
          description="Request a password reset to see one here."
        />
      ) : (
        <ol className="space-y-4" aria-label="Messages">
          {messages.map((m) => (
            <li key={m.id} className="rounded-card border border-line bg-surface p-4 shadow-card">
              <article aria-labelledby={`msg-${m.id}`}>
                <h2 id={`msg-${m.id}`} className="font-display text-base font-semibold text-ink">
                  {m.subject}
                </h2>
                <p className="mt-1 text-xs text-muted">
                  To <span className="font-medium text-ink-2">{m.to}</span> · from {m.fromAddress} ·{" "}
                  <time dateTime={m.createdAt.toISOString()}>
                    {formatRelativeTime(m.createdAt)}
                  </time>
                </p>
                <pre className="mt-3 whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-ink-2">
                  <Linkified text={m.text} />
                </pre>
              </article>
            </li>
          ))}
        </ol>
      )}
    </main>
  );
}
