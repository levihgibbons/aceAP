"use client";
/** Score one written response criterion-by-criterion. */
import { useState, useTransition, type FormEvent } from "react";
import { Button, Field, Input, useToast } from "@/components/ui";
import type { ActionState } from "./action-state";

export function RubricGradeForm({
  responseId,
  assignmentId,
  rubric,
  action,
}: {
  responseId: string;
  assignmentId: string;
  rubric: { id: string; description: string; points: number }[];
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const { toast } = useToast();
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionState>({});
  const [scores, setScores] = useState<Record<string, string>>({});
  const total = rubric.reduce((s, c) => s + c.points, 0);
  const earned = rubric.reduce((s, c) => s + (Number(scores[c.id]) || 0), 0);

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const res = await action({}, fd);
      if (res.ok) toast({ title: "Response scored", description: res.message, tone: "good" });
      else setResult(res);
    });
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-3">
      <input type="hidden" name="responseId" value={responseId} />
      <input type="hidden" name="assignmentId" value={assignmentId} />
      {result.error ? (
        <p role="alert" className="rounded-lg bg-bad-soft px-3 py-2 text-sm font-medium text-bad">
          {result.error}
        </p>
      ) : null}
      {rubric.map((c) => {
        const id = `rb-${responseId}-${c.id}`;
        return (
          <Field
            key={c.id}
            label={c.description}
            htmlFor={id}
            hint={`0–${c.points} point${c.points === 1 ? "" : "s"}`}
            error={result.fieldErrors?.[`rubric:${c.id}`]}
            required
          >
            <Input
              id={id}
              name={`rubric:${c.id}`}
              type="number"
              min={0}
              max={c.points}
              step={0.5}
              inputMode="decimal"
              className="max-w-28"
              value={scores[c.id] ?? ""}
              onChange={(e) => setScores({ ...scores, [c.id]: e.target.value })}
            />
          </Field>
        );
      })}
      <div className="flex items-center justify-between gap-3 pt-1">
        <p className="text-sm text-muted" aria-live="polite">
          {earned} / {total} points
        </p>
        <Button type="submit" size="sm" loading={pending} loadingText="Saving…">
          Save score
        </Button>
      </div>
    </form>
  );
}
