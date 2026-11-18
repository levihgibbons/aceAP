/**
 * "How mastery works" — a plain-language summary of docs/MASTERY_ENGINE.md
 * for students. Linked from progress, skill and course pages via
 * /app/progress#how-mastery-works.
 */
import { MasteryGlyph } from "@/components/ui";
import { LEVEL_LABEL } from "@/modules/mastery/types";

const LEVELS = [
  {
    level: "not_started",
    text: "No graded answers yet. Untested skills always count as Not started — we never assume you know something.",
  },
  { level: "developing", text: "You've answered at least one graded question." },
  {
    level: "approaching",
    text: "Most of your answers are correct, with a little evidence behind them.",
  },
  {
    level: "proficient",
    text: "A strong record: at least 3 correct answers without help, on 3 different questions.",
  },
  {
    level: "mastered",
    text: "A strong record on at least 5 independent correct answers, 4 different questions and 2 types of problem — including a quiz or test, across 2 separate sittings.",
  },
] as const;

export function HowMasteryWorks({ id = "how-mastery-works" }: { id?: string }) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="scroll-mt-24 rounded-card border border-line bg-surface p-5 shadow-card sm:p-6"
    >
      <h2
        id={`${id}-title`}
        className="font-display text-lg font-semibold tracking-[-0.01em] text-ink"
      >
        How mastery works
      </h2>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">
        Your level for each skill comes only from graded answers — lesson checks, practice, quizzes,
        tests and review. Time spent, finishing a lesson, or using a simulation is tracked as
        progress, but never changes mastery. That&apos;s why this page shows{" "}
        <strong className="text-ink-2">lessons finished</strong> and{" "}
        <strong className="text-ink-2">mastery</strong> separately.
      </p>

      <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {LEVELS.map(({ level, text }) => (
          <li key={level} className="rounded-xl border border-line bg-surface-2 p-3.5">
            <p className="flex items-center gap-2 text-sm font-semibold text-ink">
              <MasteryGlyph level={level} className="size-4" />
              {LEVEL_LABEL[level]}
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-muted">{text}</p>
          </li>
        ))}
      </ul>

      <div className="mt-5 grid gap-5 text-sm leading-relaxed text-muted md:grid-cols-3">
        <div>
          <h3 className="font-semibold text-ink">Help counts for less</h3>
          <p className="mt-1">
            Correct answers after a hint, a retry, the tutor or a revealed solution still count —
            just for less. Answering the same question again adds very little, so levels need
            different questions and problem types.
          </p>
        </div>
        <div>
          <h3 className="font-semibold text-ink">Needs review is a nudge</h3>
          <p className="mt-1">
            Once a skill is Proficient, a short review is scheduled after 3, 7, 16, 35 and 75 days.
            “Needs review” also appears if recent answers slipped. It asks for fresh evidence; it
            never lowers your level by itself, and time away doesn&apos;t either.
          </p>
        </div>
        <div>
          <h3 className="font-semibold text-ink">Units and courses are cautious</h3>
          <p className="mt-1">
            A unit or course reads Proficient only when every skill in it has evidence. One mastered
            skill can&apos;t make a whole course look mastered. These thresholds are AceAP defaults,
            not scientifically validated cut-offs, and your school may use its own.
          </p>
        </div>
      </div>
    </section>
  );
}
