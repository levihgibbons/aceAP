import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { MasteryGlyph } from "@/components/ui";
import { Logo } from "@/components/shell/Logo";
import { ThemeToggle } from "@/components/shell/ThemeToggle";

const PRINCIPLES = [
  { title: "One platform to learn.", body: "Lessons, worked examples and practice for each AP skill, in one place." },
  { title: "One system to measure mastery.", body: "Levels move on independent, varied evidence — not on clicks or time spent." },
  { title: "One knowledge record that grows with you.", body: "What you've shown you know stays with you, with reviews before it fades." },
] as const;

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,36rem)]">
      <aside className="relative hidden flex-col justify-between border-r border-line bg-surface px-12 py-10 lg:flex">
        <Link href="/" className="self-start rounded-lg" aria-label="AceAP home">
          <Logo />
        </Link>
        <div className="max-w-md">
          <ul className="space-y-7">
            {PRINCIPLES.map((p, i) => (
              <li key={p.title} className="flex gap-4">
                <MasteryGlyph level={(["developing", "proficient", "mastered"] as const)[i]} className="mt-1 size-5" />
                <div>
                  <p className="font-display text-xl font-semibold tracking-[-0.015em] text-ink">{p.title}</p>
                  <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-muted">{p.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <p className="max-w-md text-xs leading-relaxed text-faint">
          AP® and Advanced Placement® are registered trademarks of College Board, which is not affiliated with, and does not endorse,
          AceAP.
        </p>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="flex h-16 items-center justify-between gap-3 px-4 sm:px-8">
          <Link href="/" className="rounded-lg lg:hidden" aria-label="AceAP home">
            <Logo />
          </Link>
          <Link
            href="/"
            className="hidden items-center gap-1.5 rounded-lg text-sm text-muted hover:text-ink lg:inline-flex"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Back to home
          </Link>
          <ThemeToggle />
        </header>
        <main id="main" className="flex flex-1 flex-col items-center px-4 pb-12 pt-4 sm:px-8 sm:pt-8">
          <div className="w-full max-w-md animate-rise">{children}</div>
        </main>
        <p className="px-4 pb-6 text-center text-xs leading-relaxed text-faint lg:hidden">
          AP® is a registered trademark of College Board, which is not affiliated with, and does not endorse, AceAP.
        </p>
      </div>
    </div>
  );
}
