/**
 * LessonBlocks — renders every lesson block type. Server Component; the
 * interactive blocks are small client islands (worked examples, simulations,
 * checks, note and tutor prompts). Each block is wrapped in
 * [data-lesson-block=<index>] so progress can be tracked and resumed.
 */
import type { ReactNode } from "react";
import { CheckCircle2, Compass, Info, KeyRound, Lightbulb, TriangleAlert } from "lucide-react";
import { InlineMarkdown, Markdown } from "@/components/content/Markdown";
import { QuestionCard } from "@/components/questions/QuestionCard";
import type { QuestionAttemptContext, QuestionState, StudentQuestion } from "@/components/questions/types";
import { cn } from "@/lib/cn";
import type { LessonBlock } from "@/modules/content/schema";
import { NotePrompt } from "./NotePrompt";
import { SimulationEmbed } from "./SimulationEmbed";
import { TutorPromptChips } from "./TutorPromptChips";
import { WorkedExample } from "./WorkedExample";

export interface LessonChecks {
  attempt: QuestionAttemptContext;
  questions: Map<string, StudentQuestion>;
  state: Record<string, QuestionState>;
}

const CALLOUT = {
  info: { icon: Info, label: "Note", box: "border-info/25 bg-info-soft", iconClass: "text-info" },
  tip: { icon: Lightbulb, label: "Tip", box: "border-good/25 bg-good-soft", iconClass: "text-good" },
  warning: { icon: TriangleAlert, label: "Watch out", box: "border-warn/30 bg-warn-soft", iconClass: "text-warn" },
  key: { icon: KeyRound, label: "Key idea", box: "border-accent/25 bg-accent-soft", iconClass: "text-accent" },
} as const;

export function LessonBlocks({ blocks, lessonId, checks, noteTags }: { blocks: LessonBlock[]; lessonId: string; checks: LessonChecks | null; noteTags: string[] }) {
  const totalChecks = blocks.filter((b) => b.type === "check").length;
  const checkNumbers = blocks.map((_, i) => blocks.slice(0, i + 1).filter((b) => b.type === "check").length);
  return (
    <div className="space-y-8">
      {blocks.map((block, i) => {
        const checkNumber = checkNumbers[i];
        return (
          <div key={i} data-lesson-block={i} className="scroll-mt-24">
            <Block block={block} lessonId={lessonId} checks={checks} noteTags={noteTags} checkLabel={`Check for understanding${totalChecks > 1 ? ` ${checkNumber} of ${totalChecks}` : ""}`} />
          </div>
        );
      })}
    </div>
  );
}

function Block({ block, lessonId, checks, noteTags, checkLabel }: { block: LessonBlock; lessonId: string; checks: LessonChecks | null; noteTags: string[]; checkLabel: string }): ReactNode {
  switch (block.type) {
    case "text":
      return <Markdown>{block.md}</Markdown>;

    case "callout": {
      const tone = CALLOUT[block.tone];
      const Icon = tone.icon;
      return (
        <aside className={cn("rounded-xl border px-4 py-4 sm:px-5", tone.box)} aria-label={block.title ?? tone.label}>
          <p className="flex items-center gap-2 text-sm font-semibold text-ink">
            <Icon aria-hidden="true" className={cn("size-4 shrink-0", tone.iconClass)} />
            {block.title ?? tone.label}
          </p>
          <Markdown compact className="mt-2 text-ink-2">
            {block.md}
          </Markdown>
        </aside>
      );
    }

    case "definition":
      return (
        <div className="rounded-xl border border-line bg-surface px-4 py-4 shadow-card sm:px-5">
          <dl>
            <dt className="flex items-baseline gap-2">
              <span className="text-[0.6875rem] font-semibold uppercase tracking-wide text-muted">Definition</span>
              <span className="font-display text-base font-semibold text-ink">
                <InlineMarkdown>{block.term}</InlineMarkdown>
              </span>
            </dt>
            <dd className="mt-2">
              <Markdown compact>{block.md}</Markdown>
            </dd>
          </dl>
        </div>
      );

    case "formula":
      return (
        <figure className="rounded-xl border border-line bg-surface-2 px-4 py-3 sm:px-6">
          <div className="overflow-x-auto">
            <Markdown>{`$$\n${block.latex}\n$$`}</Markdown>
          </div>
          {block.caption ? <figcaption className="mt-1 text-center text-sm text-muted">{block.caption}</figcaption> : null}
        </figure>
      );

    case "worked_example":
      return (
        <WorkedExample
          title={block.title}
          problem={<Markdown compact>{block.problem}</Markdown>}
          steps={block.steps.map((s) => ({ title: s.title, body: <Markdown compact>{s.md}</Markdown> }))}
          answer={block.answer ? <Markdown compact>{block.answer}</Markdown> : undefined}
        />
      );

    case "check": {
      const question = checks?.questions.get(block.questionId);
      const state = question ? checks?.state[question.id] : undefined;
      if (!checks || !question || !state)
        return (
          <div role="note" className="rounded-xl border border-dashed border-line-strong bg-surface-2 px-4 py-4 text-sm text-muted">
            This check isn&apos;t available right now. You can keep going with the lesson.
          </div>
        );
      return <QuestionCard attempt={checks.attempt} question={question} initialState={state} label={`${checkLabel} · counts lightly toward mastery`} lead={block.lead} lessonId={lessonId} />;
    }

    case "simulation":
      return (
        <section aria-label={block.title ?? "Simulation"} className="rounded-card border border-line bg-surface shadow-card">
          <div className="px-5 pt-5 sm:px-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-accent">Explore</p>
            {block.title ? <h2 className="mt-1 font-display text-[1.0625rem] font-semibold text-ink">{block.title}</h2> : null}
          </div>
          <div className="px-3 py-4 sm:px-6">
            <SimulationEmbed simId={block.simId} params={block.params} lessonId={lessonId} />
          </div>
          {block.explore?.length ? (
            <div className="px-5 pb-5 sm:px-6">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                <Compass aria-hidden="true" className="size-4 text-muted" />
                Things to try
              </p>
              <ul className="mt-2 space-y-1.5">
                {block.explore.map((e, i) => (
                  <li key={i} className="flex gap-2 text-sm text-ink-2">
                    <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-faint" />
                    <span className="min-w-0">
                      <InlineMarkdown>{e}</InlineMarkdown>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <p className="flex items-start gap-1.5 rounded-b-card border-t border-line bg-surface-2 px-5 py-3 text-xs text-muted sm:px-6">
            <Info aria-hidden="true" className="mt-px size-3.5 shrink-0" />
            Exploring doesn&apos;t change your mastery — the questions do.
          </p>
        </section>
      );

    case "note_prompt":
      return <NotePrompt prompt={<Markdown compact>{block.prompt}</Markdown>} suggestedTitle={block.suggestedTitle} starter={block.starter} tags={noteTags} />;

    case "tutor_prompt":
      return <TutorPromptChips prompts={block.prompts} />;

    case "summary":
      return (
        <section aria-label="Key points" className="rounded-card border border-line bg-surface p-5 shadow-card sm:p-6">
          <h2 className="font-display text-[1.0625rem] font-semibold text-ink">Key points</h2>
          <ul className="mt-3 space-y-2.5">
            {block.points.map((p, i) => (
              <li key={i} className="flex gap-2.5 text-[0.9375rem] text-ink-2">
                <CheckCircle2 aria-hidden="true" className="mt-1 size-4 shrink-0 text-good" />
                <span className="min-w-0">
                  <InlineMarkdown>{p}</InlineMarkdown>
                </span>
              </li>
            ))}
          </ul>
        </section>
      );

    case "image":
      return (
        <figure>
          {/* eslint-disable-next-line @next/next/no-img-element -- authored lesson images have unknown dimensions */}
          <img src={block.src} alt={block.alt} loading="lazy" decoding="async" className="h-auto max-w-full rounded-xl border border-line" />
          {block.caption ? <figcaption className="mt-2 text-sm text-muted">{block.caption}</figcaption> : null}
        </figure>
      );
  }
}
