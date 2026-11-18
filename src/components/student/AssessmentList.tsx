/** Curriculum quizzes/tests with the student's best score and attempt count. */
import { ClipboardCheck } from "lucide-react";
import { ButtonLink, pluralize } from "@/components/ui";
import type { AssessmentNode } from "@/modules/curriculum/queries";
import type { CourseOverview } from "@/modules/learning/overview";
import { ASSESSMENT_KIND_LABEL, scoreText } from "./format";

export function AssessmentList({
  assessments,
  o,
}: {
  assessments: AssessmentNode[];
  o: CourseOverview;
}) {
  return (
    <ul className="divide-y divide-line">
      {assessments.map((a) => {
        const res = o.assessmentResults.get(a.id);
        const best = res ? scoreText(res.bestScore, res.maxScore) : null;
        return (
          <li
            key={a.id}
            className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex min-w-0 items-start gap-3">
              <ClipboardCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-faint" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink">{a.title}</p>
                <p className="text-xs text-muted">
                  {ASSESSMENT_KIND_LABEL[a.kind] ?? a.kind} ·{" "}
                  {pluralize(a.questionCount, "question")}
                  {a.timeLimitSeconds ? ` · ${Math.round(a.timeLimitSeconds / 60)} min limit` : ""}
                  {res
                    ? ` · Best ${best} · ${pluralize(res.attempts, "attempt")}`
                    : " · Not taken yet"}
                </p>
              </div>
            </div>
            <ButtonLink
              href={`/app/assessments/${a.id}`}
              size="sm"
              variant={res ? "ghost" : "secondary"}
              className="self-start sm:self-auto"
              aria-label={`${res ? "Retake" : "Start"} ${a.title}`}
            >
              {res ? "Retake" : "Start"}
            </ButtonLink>
          </li>
        );
      })}
    </ul>
  );
}
