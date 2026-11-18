"use client";
/** Per-student accommodation dialog (extended time, own due date, attempts, note). */
import { useState, useTransition, type FormEvent } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Button, Dialog, Field, Input, Textarea, useToast } from "@/components/ui";
import type { ActionState } from "./action-state";

export interface AccommodationValue {
  dueAt: string | null;
  maxAttempts: number | null;
  timeMultiplier: number | null;
  note: string;
}

const pad = (n: number) => String(n).padStart(2, "0");
function isoToLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function localToIso(value: string): string {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

export function AccommodationEditor({
  assignmentId,
  student,
  current,
  classDueLabel,
  action,
}: {
  assignmentId: string;
  student: { id: string; name: string };
  current: AccommodationValue | null;
  /** Server-formatted class due date (avoids SSR/client time-zone drift). */
  classDueLabel: string | null;
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionState>({});
  const [form, setForm] = useState({ timeMultiplier: "", dueLocal: "", maxAttempts: "", note: "" });

  const openEditor = () => {
    setResult({});
    setForm({
      timeMultiplier: current?.timeMultiplier ? String(current.timeMultiplier) : "",
      dueLocal: isoToLocal(current?.dueAt ?? null),
      maxAttempts: current?.maxAttempts ? String(current.maxAttempts) : "",
      note: current?.note ?? "",
    });
    setOpen(true);
  };

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const res = await action({}, fd);
      if (res.ok) {
        setOpen(false);
        toast({
          title: "Accommodation saved",
          description: `${student.name}: changes apply to this assignment only.`,
          tone: "good",
        });
      } else setResult(res);
    });
  };

  const formId = `acc-${student.id}`;
  const fe = result.fieldErrors ?? {};
  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        icon={<SlidersHorizontal aria-hidden="true" className="size-3.5" />}
        onClick={openEditor}
        aria-label={`Edit accommodations for ${student.name}`}
      >
        {current ? "Edit" : "Add"}
      </Button>
      {open ? (
        <Dialog
          open={open}
          onClose={() => setOpen(false)}
          title={`Accommodations — ${student.name}`}
          description="Applies to this assignment only. Clear a field to remove that accommodation."
          footer={
            <>
              <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
                Cancel
              </Button>
              <Button type="submit" form={formId} loading={pending} loadingText="Saving…">
                Save
              </Button>
            </>
          }
        >
          <form id={formId} onSubmit={submit} noValidate className="space-y-4">
            <input type="hidden" name="assignmentId" value={assignmentId} />
            <input type="hidden" name="studentId" value={student.id} />
            <input type="hidden" name="dueAt" value={localToIso(form.dueLocal)} />
            {result.error ? (
              <p
                role="alert"
                className="rounded-lg bg-bad-soft px-3 py-2 text-sm font-medium text-bad"
              >
                {result.error}
              </p>
            ) : null}
            <Field
              label="Extended time (multiplier)"
              htmlFor={`${formId}-tm`}
              error={fe.timeMultiplier}
              hint="1–3, e.g. 1.5 for time-and-a-half on timed work."
            >
              <Input
                id={`${formId}-tm`}
                name="timeMultiplier"
                type="number"
                min={1}
                max={3}
                step={0.25}
                inputMode="decimal"
                value={form.timeMultiplier}
                onChange={(e) => setForm({ ...form, timeMultiplier: e.target.value })}
              />
            </Field>
            <Field
              label="Personal due date"
              htmlFor={`${formId}-due`}
              error={fe.dueAt}
              hint={
                classDueLabel
                  ? `Class due date: ${classDueLabel}. Enter your local time.`
                  : "The class has no due date. Enter your local time."
              }
            >
              <Input
                id={`${formId}-due`}
                type="datetime-local"
                value={form.dueLocal}
                onChange={(e) => setForm({ ...form, dueLocal: e.target.value })}
              />
            </Field>
            <Field
              label="Attempts allowed"
              htmlFor={`${formId}-att`}
              error={fe.maxAttempts}
              hint="1–20. Empty uses the assignment's setting."
            >
              <Input
                id={`${formId}-att`}
                name="maxAttempts"
                type="number"
                min={1}
                max={20}
                inputMode="numeric"
                value={form.maxAttempts}
                onChange={(e) => setForm({ ...form, maxAttempts: e.target.value })}
              />
            </Field>
            <Field
              label="Note"
              htmlFor={`${formId}-note`}
              error={fe.note}
              hint="Why the accommodation applies. Max 300 characters."
            >
              <Textarea
                id={`${formId}-note`}
                name="note"
                rows={2}
                maxLength={300}
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
              />
            </Field>
          </form>
        </Dialog>
      ) : null}
    </>
  );
}
