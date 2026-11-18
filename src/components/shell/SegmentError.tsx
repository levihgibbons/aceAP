"use client";
/**
 * SegmentError — body for error.tsx boundaries inside the shell. Shows a calm
 * message, a retry button and a way home; the error digest is shown as a
 * reference so support can match server logs (never the raw message in prod).
 */
import { useEffect } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { AlertTriangle } from "lucide-react";

export function SegmentError({ error, retry, homeHref }: { error: unknown; retry: () => void; homeHref: string }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  const digest = error instanceof Error && "digest" in error && typeof error.digest === "string" ? error.digest : undefined;

  return (
    <div role="alert" className="mx-auto flex max-w-lg flex-col items-center py-16 text-center">
      <span aria-hidden="true" className="mb-5 inline-flex size-12 items-center justify-center rounded-xl bg-bad-soft text-bad">
        <AlertTriangle className="size-5" />
      </span>
      <h1 className="font-display text-2xl font-semibold tracking-[-0.015em] text-ink">This page didn&apos;t load</h1>
      <p className="mt-2 text-[0.9375rem] leading-relaxed text-muted">
        Something went wrong on our side. Your saved work is safe — try again, or head back and come back to this later.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Button onClick={() => retry()}>Try again</Button>
        <ButtonLink href={homeHref} variant="secondary">
          Go to home
        </ButtonLink>
      </div>
      {digest ? <p className="mt-6 font-mono text-[0.6875rem] text-faint">Reference: {digest}</p> : null}
    </div>
  );
}
