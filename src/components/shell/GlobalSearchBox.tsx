/**
 * GlobalSearchBox — GET search form that submits to /app/search?q=… .
 * Built on next/form: client-side navigation when JS is available, a plain
 * GET form submission when it isn't.
 *   <GlobalSearchBox />
 */
import Form from "next/form";
import { Search } from "lucide-react";
import { cn } from "@/lib/cn";

export function GlobalSearchBox({ className, action = "/app/search" }: { className?: string; action?: string }) {
  return (
    <Form action={action} role="search" aria-label="Site search" className={cn("relative w-full max-w-md", className)}>
      <label htmlFor="global-search" className="sr-only">
        Search courses, skills and your knowledge vault
      </label>
      <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
      <input
        id="global-search"
        type="search"
        name="q"
        required
        maxLength={200}
        autoComplete="off"
        placeholder="Search courses, skills, notes…"
        className="h-10 w-full rounded-lg border border-line bg-surface-2 pl-9 pr-3 text-sm text-ink placeholder:text-faint transition-colors hover:border-line-strong focus-visible:border-accent focus-visible:bg-surface focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-accent"
      />
      <button type="submit" className="sr-only">
        Search
      </button>
    </Form>
  );
}
