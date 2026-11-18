/** A read-only rendering of what the student answered (results and review screens). No hooks. */
import { InlineMarkdown } from "@/components/content/Markdown";
import type { QuestionResponse, StudentQuestion } from "./types";

type Option = { id: string; text: string };

const textOf = (list: Option[] | undefined, id: string) => list?.find((x) => x.id === id)?.text ?? id;

export function ResponseSummary({ question, response }: { question: StudentQuestion; response: QuestionResponse | null }) {
  if (!response) return <p className="text-sm italic text-muted">No answer given.</p>;
  switch (response.type) {
    case "multiple_choice":
      return (
        <p className="text-sm text-ink">
          <InlineMarkdown>{textOf(question.choices, response.choiceId)}</InlineMarkdown>
        </p>
      );
    case "multi_select":
      return (
        <ul className="list-disc space-y-0.5 pl-5 text-sm text-ink">
          {response.choiceIds.map((c) => (
            <li key={c}>
              <InlineMarkdown>{textOf(question.choices, c)}</InlineMarkdown>
            </li>
          ))}
        </ul>
      );
    case "numeric":
      return (
        <p className="font-mono text-sm text-ink">
          {response.value}
          {question.unit ? <span className="ml-1 font-sans text-ink-2">{question.unit}</span> : null}
        </p>
      );
    case "expression":
      return <p className="break-all font-mono text-sm text-ink">{response.value}</p>;
    case "ordering":
      return (
        <ol className="list-decimal space-y-0.5 pl-5 text-sm text-ink">
          {response.order.map((id) => (
            <li key={id}>
              <InlineMarkdown>{textOf(question.items, id)}</InlineMarkdown>
            </li>
          ))}
        </ol>
      );
    case "matching":
      return (
        <ul className="space-y-0.5 text-sm text-ink">
          {(question.left ?? []).map((l) => (
            <li key={l.id}>
              <InlineMarkdown>{l.text}</InlineMarkdown> <span className="text-muted">↔</span>{" "}
              {response.pairs[l.id] ? (
                <InlineMarkdown>{textOf(question.right, response.pairs[l.id])}</InlineMarkdown>
              ) : (
                <span className="italic text-muted">not matched</span>
              )}
            </li>
          ))}
        </ul>
      );
    case "short_response":
      return <p className="whitespace-pre-wrap text-sm text-ink">{response.text}</p>;
  }
}
