"use client";
/**
 * NewClassForm — create a class (name, course, school). Courses arrive grouped
 * by category with their AceAP content status, so teachers can see what is a
 * full pilot sequence and what is outline-only before they choose.
 */
import { useActionState, useState } from "react";
import { createClassAction, type FormState } from "@/app/teacher/classes/actions";
import { Badge, Button, Field, Input, Select } from "@/components/ui";

export interface CourseOption {
  id: string;
  name: string;
  status: string;
  statusLabel: string;
  statusDescription: string;
}

export interface CourseGroup {
  category: string;
  label: string;
  courses: CourseOption[];
}

const STATUS_TONE: Record<string, "good" | "info" | "neutral" | "warn"> = {
  complete: "good",
  pilot_available: "good",
  lessons_in_development: "info",
  outline_available: "neutral",
  catalog_only: "warn",
};

export function NewClassForm({ groups, organizations }: { groups: CourseGroup[]; organizations: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(createClassAction, {});
  const [courseId, setCourseId] = useState(state.values?.courseId ?? "");
  const selected = groups.flatMap((g) => g.courses).find((c) => c.id === courseId);

  return (
    <form action={action} className="space-y-6" noValidate>
      {state.error ? (
        <p role="alert" className="rounded-lg border border-bad/40 bg-bad-soft px-4 py-3 text-sm font-medium text-bad">
          {state.error}
        </p>
      ) : null}

      <Field label="Class name" htmlFor="name" required error={state.fieldErrors?.name} hint="Students see this name, e.g. “AP Calculus AB — Period 3”.">
        <Input id="name" name="name" required minLength={2} maxLength={80} defaultValue={state.values?.name ?? ""} autoComplete="off" />
      </Field>

      <Field label="Course" htmlFor="courseId" required error={state.fieldErrors?.courseId} hint="Only courses College Board currently offers are listed.">
        <Select id="courseId" name="courseId" required value={courseId} onChange={(e) => setCourseId(e.target.value)}>
          <option value="" disabled>
            Choose a course…
          </option>
          {groups.map((g) => (
            <optgroup key={g.category} label={g.label}>
              {g.courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — {c.statusLabel}
                </option>
              ))}
            </optgroup>
          ))}
        </Select>
      </Field>

      <div aria-live="polite" className="min-h-6">
        {selected ? (
          <div className="rounded-lg border border-line bg-surface-2 p-4 text-sm">
            <p className="flex flex-wrap items-center gap-2 font-medium text-ink">
              {selected.name}
              <Badge tone={STATUS_TONE[selected.status] ?? "neutral"}>{selected.statusLabel}</Badge>
            </p>
            <p className="mt-1 text-muted">{selected.statusDescription}</p>
            {selected.status !== "pilot_available" && selected.status !== "complete" ? (
              <p className="mt-2 text-ink-2">
                You can still create the class and share the join code, but there are no assessed lessons yet — the mastery heatmap will stay empty until content exists.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      {organizations.length > 1 ? (
        <Field label="School" htmlFor="organizationId" required error={state.fieldErrors?.organizationId}>
          <Select id="organizationId" name="organizationId" required defaultValue={state.values?.organizationId ?? organizations[0].id}>
            {organizations.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </Select>
        </Field>
      ) : organizations.length === 1 ? (
        <>
          <input type="hidden" name="organizationId" value={organizations[0].id} />
          <p className="text-sm text-muted">
            School: <span className="font-medium text-ink">{organizations[0].name}</span>
          </p>
        </>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" loading={pending} loadingText="Creating class…">
          Create class
        </Button>
        <p className="text-xs text-muted">You’ll get a join code to share with students.</p>
      </div>
    </form>
  );
}
