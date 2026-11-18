/**
 * IntroCard — the "before you start" card shared by the practice, assessment,
 * review and assignment start pages: what it covers, the facts (questions,
 * timing, help policy), how it counts toward mastery, and the Start/Resume
 * controls. Server Component.
 */
import Link from "next/link";
import type { ReactNode } from "react";
import { Card, KeyValue, type KeyValueItem } from "@/components/ui";

export function IntroCard({
  title,
  children,
  facts,
  counts,
  actions,
  aside,
}: {
  title: string;
  /** What it covers. */
  children?: ReactNode;
  facts: KeyValueItem[];
  /** How it counts toward mastery. */
  counts: ReactNode;
  actions: ReactNode;
  /** Optional right column (previous attempts, current mastery…). */
  aside?: ReactNode;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <Card padded={false} as="section" aria-label={title}>
        <div className="space-y-5 p-5 sm:p-6">
          {children ? <div className="space-y-3 text-[0.9375rem] leading-relaxed text-ink-2">{children}</div> : null}
          <KeyValue items={facts} layout="stacked" />
          <div className="rounded-lg border border-line bg-surface-2 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">How it counts toward mastery</p>
            <div className="mt-1.5 text-sm leading-relaxed text-ink-2">{counts}</div>
          </div>
        </div>
        <div className="rounded-b-card border-t border-line bg-surface-2 px-5 py-4 sm:px-6">{actions}</div>
      </Card>
      {aside ? <div className="space-y-4">{aside}</div> : null}
    </div>
  );
}

/** Previous attempts summary for the intro page's side column. */
export function AttemptHistoryCard({ submitted, best, last }: { submitted: number; best: string | null; last: { href: string; label: string } | null }) {
  return (
    <Card>
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">Your previous attempts</h2>
      {submitted === 0 ? (
        <p className="mt-2 text-sm text-muted">None yet. This will be your first.</p>
      ) : (
        <div className="mt-3 space-y-3">
          <KeyValue
            items={[
              { label: "Submitted", value: submitted },
              ...(best ? [{ label: "Best score", value: best }] : []),
            ]}
          />
          {last ? (
            <Link href={last.href} className="inline-block text-sm font-medium text-accent underline-offset-4 hover:underline">
              {last.label}
            </Link>
          ) : null}
        </div>
      )}
    </Card>
  );
}
