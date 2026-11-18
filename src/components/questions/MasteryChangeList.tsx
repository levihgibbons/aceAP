/**
 * MasteryChangeList — what an answer (or a finished attempt) did to skill
 * levels: "Chain rule: powers of functions — Developing → Approaching mastery".
 * No hooks; renders in Server and Client Components.
 */
import Link from "next/link";
import { ArrowRight, RotateCcw, TrendingDown, TrendingUp } from "lucide-react";
import { MasteryGlyph } from "@/components/ui";
import { cn } from "@/lib/cn";
import { LEVEL_LABEL, LEVEL_RANK } from "@/modules/mastery/types";
import type { MasteryChange } from "./types";

export function describeMasteryChange(c: MasteryChange): string {
  const review = c.needsReview ? " (needs review)" : "";
  if (c.before === c.after) return `${c.skillName}: stays ${LEVEL_LABEL[c.after]}${review}`;
  return `${c.skillName}: ${LEVEL_LABEL[c.before]} → ${LEVEL_LABEL[c.after]}${review}`;
}

export function MasteryChangeList({
  changes,
  linkSkills = false,
  variant = "inline",
  className,
}: {
  changes: MasteryChange[];
  /** Link each skill to its mastery page (/app/skills/<id>). */
  linkSkills?: boolean;
  /** inline: compact lines under feedback. list: roomier rows for results pages. */
  variant?: "inline" | "list";
  className?: string;
}) {
  if (changes.length === 0) return null;
  return (
    <ul className={cn(variant === "list" ? "divide-y divide-line" : "space-y-1", className)}>
      {changes.map((c) => {
        const up = LEVEL_RANK[c.after] > LEVEL_RANK[c.before];
        const down = LEVEL_RANK[c.after] < LEVEL_RANK[c.before];
        return (
          <li key={c.skillId} className={cn("flex flex-wrap items-center gap-x-2 gap-y-1 text-sm", variant === "list" && "py-3 first:pt-0 last:pb-0")}>
            {up ? (
              <TrendingUp aria-hidden="true" className="size-4 shrink-0 text-good" />
            ) : down ? (
              <TrendingDown aria-hidden="true" className="size-4 shrink-0 text-warn" />
            ) : (
              <ArrowRight aria-hidden="true" className="size-4 shrink-0 text-faint" />
            )}
            {linkSkills ? (
              <Link href={`/app/skills/${c.skillId}`} className="font-medium text-ink underline-offset-4 hover:underline">
                {c.skillName}
              </Link>
            ) : (
              <span className="font-medium text-ink">{c.skillName}</span>
            )}
            <span aria-hidden="true" className="text-faint">
              —
            </span>
            {c.before === c.after ? (
              <span className="inline-flex items-center gap-1.5 text-ink-2">
                <span className="text-muted">stays</span>
                <MasteryGlyph level={c.after} className="size-3.5" />
                {LEVEL_LABEL[c.after]}
              </span>
            ) : (
              <span className="inline-flex flex-wrap items-center gap-1.5 text-ink-2">
                <MasteryGlyph level={c.before} className="size-3.5" />
                {LEVEL_LABEL[c.before]}
                <ArrowRight aria-hidden="true" className="size-3.5 text-faint" />
                <span className="sr-only">to</span>
                <MasteryGlyph level={c.after} className="size-3.5" />
                <span className="font-medium text-ink">{LEVEL_LABEL[c.after]}</span>
              </span>
            )}
            {c.needsReview ? (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-m-review">
                <RotateCcw aria-hidden="true" className="size-3" />
                Needs review
              </span>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
