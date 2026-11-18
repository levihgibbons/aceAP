/** The exam-readiness disclaimer, displayed prominently wherever readiness appears. */
import { Info } from "lucide-react";
import { cn } from "@/lib/cn";

export function ReadinessDisclaimer({ text, className }: { text: string; className?: string }) {
  return (
    <div
      role="note"
      aria-label="About exam readiness"
      className={cn(
        "flex items-start gap-3 rounded-card border border-info/30 bg-info-soft px-4 py-3.5 text-sm sm:px-5",
        className,
      )}
    >
      <Info aria-hidden="true" className="mt-0.5 size-4.5 shrink-0 text-info" />
      <p className="leading-relaxed text-ink-2">
        <strong className="font-semibold text-ink">Not a score prediction. </strong>
        {text.replace(/^This is not a predicted AP score\.\s*/, "")}
      </p>
    </div>
  );
}
