"use client";
/** Edit the platform-default level thresholds and minimum-evidence rules, then publish (with a confirmation). */
import { useState, useTransition } from "react";
import { AlertTriangle } from "lucide-react";
import { Button, Dialog, Field, Input, useToast } from "@/components/ui";
import type { ActionState } from "@/components/assignments/action-state";
import type { MasteryPolicyConfig } from "@/modules/mastery/types";
import { REQUIREMENTS, type LevelKey } from "./mastery-requirements";

type Levels = MasteryPolicyConfig["levels"];

const LEVEL_TITLE: Record<LevelKey, string> = {
  approaching: "Approaching",
  proficient: "Proficient",
  mastered: "Mastered",
};

type Draft = Record<LevelKey, Record<string, string>>;
const toDraft = (l: Levels): Draft => ({
  approaching: {
    minEstimate: String(l.approaching.minEstimate),
    minEffectiveEvidence: String(l.approaching.minEffectiveEvidence),
  },
  proficient: Object.fromEntries(Object.entries(l.proficient).map(([k, v]) => [k, String(v)])),
  mastered: Object.fromEntries(Object.entries(l.mastered).map(([k, v]) => [k, String(v)])),
});

export function MasteryPolicyEditor({
  current,
  currentName,
  currentVersion,
  studentStates,
  action,
}: {
  current: Levels;
  currentName: string;
  currentVersion: number;
  studentStates: number;
  action: (levels: unknown, name: unknown) => Promise<ActionState>;
}) {
  const { toast } = useToast();
  const [draft, setDraft] = useState<Draft>(() => toDraft(current));
  const [name, setName] = useState(currentName);
  const [result, setResult] = useState<ActionState>({});
  const [confirm, setConfirm] = useState(false);
  const [pending, start] = useTransition();

  const clientErrors: Record<string, string> = {};
  const levels: Record<string, Record<string, number>> = {};
  for (const lvl of ["approaching", "proficient", "mastered"] as LevelKey[]) {
    levels[lvl] = {};
    for (const [k, v] of Object.entries(draft[lvl])) {
      const n = Number(v);
      if (v.trim() === "" || !Number.isFinite(n))
        clientErrors[`levels.${lvl}.${k}`] = "Enter a number.";
      levels[lvl][k] = n;
    }
  }
  const fe = { ...(result.fieldErrors ?? {}), ...clientErrors };
  const valid = Object.keys(clientErrors).length === 0;
  // Field-by-field (jsonb does not preserve key order, so JSON strings can't be compared).
  const dirty =
    name.trim() !== currentName ||
    REQUIREMENTS.some((r) =>
      r.levels.some((l) => levels[l][r.key] !== (current[l] as Record<string, number>)[r.key]),
    );

  const publish = () =>
    start(async () => {
      const res = await action(levels, name);
      if (res.ok) {
        setConfirm(false);
        setResult({});
        toast({
          title: "Mastery policy published",
          description: res.message,
          tone: "good",
          duration: 8000,
        });
      } else {
        setConfirm(false);
        setResult(res);
      }
    });

  return (
    <div className="space-y-5">
      {result.error ? (
        <p role="alert" className="rounded-lg bg-bad-soft px-3 py-2 text-sm font-medium text-bad">
          {result.error}
        </p>
      ) : null}
      <Field label="Policy name" htmlFor="mp-name" hint="Shown in the version history.">
        <Input
          id="mp-name"
          value={name}
          maxLength={80}
          onChange={(e) => setName(e.target.value)}
          className="max-w-sm"
        />
      </Field>
      <div className="overflow-x-auto rounded-lg border border-line">
        <table className="w-full min-w-[40rem] text-sm">
          <caption className="sr-only">Level requirements</caption>
          <thead className="bg-surface-2 text-xs text-muted">
            <tr>
              <th scope="col" className="px-3 py-2 text-left font-semibold">
                Requirement
              </th>
              {(["approaching", "proficient", "mastered"] as LevelKey[]).map((l) => (
                <th key={l} scope="col" className="px-3 py-2 text-left font-semibold">
                  {LEVEL_TITLE[l]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {REQUIREMENTS.map((r) => (
              <tr key={r.key} className="border-t border-line align-top">
                <th scope="row" className="px-3 py-2.5 text-left font-medium text-ink">
                  {r.label}
                  <span className="mt-0.5 block text-xs font-normal text-muted">{r.hint}</span>
                </th>
                {(["approaching", "proficient", "mastered"] as LevelKey[]).map((l) => {
                  const path = `levels.${l}.${r.key}`;
                  const id = `mp-${l}-${r.key}`;
                  if (!r.levels.includes(l))
                    return (
                      <td key={l} className="px-3 py-2.5 text-xs text-faint">
                        n/a
                      </td>
                    );
                  return (
                    <td key={l} className="px-3 py-2">
                      <label htmlFor={id} className="sr-only">
                        {LEVEL_TITLE[l]}: {r.label}
                      </label>
                      <Input
                        id={id}
                        type="number"
                        step={r.step}
                        inputMode="decimal"
                        className="w-28 tabular-nums"
                        value={draft[l][r.key] ?? ""}
                        aria-invalid={fe[path] ? true : undefined}
                        aria-describedby={fe[path] ? `${id}-err` : undefined}
                        onChange={(e) =>
                          setDraft({ ...draft, [l]: { ...draft[l], [r.key]: e.target.value } })
                        }
                      />
                      {fe[path] ? (
                        <p id={`${id}-err`} className="mt-1 text-xs font-medium text-bad">
                          {fe[path]}
                        </p>
                      ) : null}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {fe.form ? <p className="text-sm font-medium text-bad">{fe.form}</p> : null}
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setConfirm(true)} disabled={!valid || !dirty}>
          Publish version {currentVersion + 1}
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            setDraft(toDraft(current));
            setName(currentName);
            setResult({});
          }}
          disabled={!dirty}
        >
          Reset
        </Button>
      </div>

      <Dialog
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Publish a new platform mastery policy?"
        description={`Becomes version ${currentVersion + 1} of the platform default.`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(false)} disabled={pending}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={publish}
              loading={pending}
              loadingText="Recalculating…"
            >
              Publish and recalculate
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-sm text-ink-2">
          <p className="flex items-start gap-2 rounded-lg bg-warn-soft px-3 py-2 text-warn">
            <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <span>
              Publishing recalculates every student&apos;s mastery ({studentStates} skill state
              {studentStates === 1 ? "" : "s"} today) and appends a snapshot for each. Levels may go
              up or down, which changes mastery-graded grades and recommendations.
            </span>
          </p>
          <p>
            Evidence is never edited. Earlier snapshots and policy versions are kept, so previous
            results stay inspectable. Organisations with their own published policy are recalculated
            under their own policy.
          </p>
          <p>These thresholds are product defaults, not scientifically validated cut-offs.</p>
        </div>
      </Dialog>
    </div>
  );
}
