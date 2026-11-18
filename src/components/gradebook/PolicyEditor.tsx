"use client";
/**
 * Grading-policy editor with a live, debounced server preview of how every
 * grade in the class would change. Publishing creates a new version; earlier
 * versions are kept and evidence is never touched.
 */
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { AlertTriangle, ArrowDown, ArrowUp, Minus } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Dialog,
  Field,
  Input,
  RadioGroup,
  Spinner,
  Switch,
  useToast,
} from "@/components/ui";
import { cn } from "@/lib/cn";
import type { GradingPolicyConfig } from "@/modules/gradebook/policy";
import type { PolicyPreview } from "@/modules/gradebook/service";
import type { MasteryLevel } from "@/modules/mastery/types";
import type { ActionState } from "@/components/assignments/action-state";

const LEVELS: { level: MasteryLevel; label: string }[] = [
  { level: "mastered", label: "Mastered" },
  { level: "proficient", label: "Proficient" },
  { level: "approaching", label: "Approaching mastery" },
  { level: "developing", label: "Developing" },
  { level: "not_started", label: "Not started" },
];

export interface PolicyVersionView {
  id: string;
  version: number;
  config: GradingPolicyConfig;
  isActive: boolean;
  /** Server-formatted. */
  createdLabel: string;
  createdBy: string;
}

type Draft = {
  levelGrades: Record<MasteryLevel, string>;
  masteryBasis: "current" | "highest";
  attemptRule: "best" | "latest";
  latePenalty: string;
};

const toDraft = (c: GradingPolicyConfig): Draft => ({
  levelGrades: Object.fromEntries(
    LEVELS.map(({ level }) => [level, String(c.levelGrades[level])]),
  ) as Record<MasteryLevel, string>,
  masteryBasis: c.masteryBasis,
  attemptRule: c.attemptRule,
  latePenalty: String(c.latePenalty),
});

function parseDraft(d: Draft): {
  config: GradingPolicyConfig | null;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};
  const num = (v: string, key: string) => {
    if (v.trim() === "") {
      errors[key] = "Required.";
      return 0;
    }
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0 || n > 100) errors[key] = "Enter 0–100.";
    return n;
  };
  const levelGrades = Object.fromEntries(
    LEVELS.map(({ level }) => [level, num(d.levelGrades[level], `levelGrades.${level}`)]),
  ) as Record<MasteryLevel, number>;
  const latePenalty = num(d.latePenalty, "latePenalty");
  return Object.keys(errors).length
    ? { config: null, errors }
    : {
        config: {
          levelGrades,
          masteryBasis: d.masteryBasis,
          attemptRule: d.attemptRule,
          latePenalty,
        },
        errors,
      };
}

const fmt = (x: number | null) => (x === null ? "—" : `${Math.round(x * 10) / 10}%`);
/** Field-by-field: configs from jsonb don't keep key order, so JSON strings can't be compared. */
const same = (a: GradingPolicyConfig, b: GradingPolicyConfig) =>
  a.masteryBasis === b.masteryBasis &&
  a.attemptRule === b.attemptRule &&
  a.latePenalty === b.latePenalty &&
  LEVELS.every(({ level }) => a.levelGrades[level] === b.levelGrades[level]);

export function PolicyEditor({
  classId,
  className,
  current,
  currentVersion,
  versions,
  previewAction,
  publishAction,
}: {
  classId: string;
  className: string;
  current: GradingPolicyConfig;
  currentVersion: number;
  versions: PolicyVersionView[];
  previewAction: (
    classId: string,
    config: unknown,
  ) => Promise<ActionState & { preview?: PolicyPreview }>;
  publishAction: (classId: string, config: unknown) => Promise<ActionState>;
}) {
  const { toast } = useToast();
  const [draft, setDraft] = useState<Draft>(() => toDraft(current));
  const [preview, setPreview] = useState<PolicyPreview | null>(null);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewing, startPreview] = useTransition();
  const [publishing, startPublish] = useTransition();
  const [confirm, setConfirm] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const request = useRef(0);

  const { config, errors } = useMemo(() => parseDraft(draft), [draft]);
  const configKey = config ? JSON.stringify(config) : null;
  const dirty = config ? !same(config, current) : true;

  useEffect(() => {
    if (!configKey) return;
    const id = ++request.current;
    const timer = setTimeout(() => {
      startPreview(async () => {
        const res = await previewAction(classId, JSON.parse(configKey));
        if (id !== request.current) return;
        if (res.ok && res.preview) {
          setPreview(res.preview);
          setServerErrors({});
          setPreviewError(null);
        } else {
          setServerErrors(res.fieldErrors ?? {});
          setPreviewError(res.error ?? "Couldn't compute a preview.");
        }
      });
    }, 350);
    return () => clearTimeout(timer);
  }, [configKey, classId, currentVersion, previewAction]);

  const fe = { ...serverErrors, ...errors };
  const ordered = LEVELS.map(({ level }) => Number(draft.levelGrades[level]));
  const nonMonotonic = ordered.some(
    (v, i) => i > 0 && Number.isFinite(v) && Number.isFinite(ordered[i - 1]) && v > ordered[i - 1],
  );

  const publish = () =>
    startPublish(async () => {
      if (!config) return;
      const res = await publishAction(classId, config);
      if (res.ok) {
        setConfirm(false);
        setPublishError(null);
        toast({ title: "Grading policy published", description: res.message, tone: "good" });
      } else {
        setPublishError(res.error ?? "Couldn't publish.");
        setServerErrors(res.fieldErrors ?? {});
      }
    });

  const s = preview?.summary;
  const masteryAssignments = preview?.assignments.filter((a) => a.rows.length > 0) ?? [];

  return (
    <div className="grid gap-6 xl:grid-cols-[22rem_1fr]">
      <Card padded={false} className="self-start">
        <CardHeader
          title="Policy settings"
          titleAs="h2"
          description={`Editing ${className}. Changes are previewed live and saved only when you publish.`}
        />
        <CardBody className="space-y-6">
          <fieldset>
            <legend className="text-sm font-medium text-ink">Mastery level → grade</legend>
            <p className="mt-1 text-xs text-muted">
              Percentage awarded per skill on mastery-graded assignments; a multi-skill assignment
              averages its skills.
            </p>
            <div className="mt-3 space-y-2.5">
              {LEVELS.map(({ level, label }) => {
                const key = `levelGrades.${level}`;
                const id = `lg-${level}`;
                return (
                  <div key={level} className="grid grid-cols-[1fr_6.5rem] items-start gap-3">
                    <label htmlFor={id} className="pt-2.5 text-sm text-ink-2">
                      {label}
                    </label>
                    <div>
                      <div className="relative">
                        <Input
                          id={id}
                          type="number"
                          min={0}
                          max={100}
                          step={1}
                          inputMode="decimal"
                          className="pr-7 text-right tabular-nums"
                          value={draft.levelGrades[level]}
                          aria-invalid={fe[key] ? true : undefined}
                          aria-describedby={fe[key] ? `${id}-err` : undefined}
                          onChange={(e) =>
                            setDraft({
                              ...draft,
                              levelGrades: { ...draft.levelGrades, [level]: e.target.value },
                            })
                          }
                        />
                        <span
                          aria-hidden="true"
                          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted"
                        >
                          %
                        </span>
                      </div>
                      {fe[key] ? (
                        <p id={`${id}-err`} className="mt-1 text-xs font-medium text-bad">
                          {fe[key]}
                        </p>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
            {nonMonotonic ? (
              <p className="mt-3 flex items-start gap-2 text-xs text-warn">
                <AlertTriangle aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />A lower
                mastery level earns more than a higher one. That&apos;s allowed, but check it&apos;s
                intended.
              </p>
            ) : null}
          </fieldset>

          <RadioGroup
            name="masteryBasis"
            legend="Which mastery level counts"
            value={draft.masteryBasis}
            onChange={(v) => setDraft({ ...draft, masteryBasis: v as Draft["masteryBasis"] })}
            options={[
              {
                value: "current",
                label: "Current level",
                description: "Grades follow the latest evidence, up or down.",
              },
              {
                value: "highest",
                label: "Highest level demonstrated",
                description: "A grade never drops after a student shows a level once.",
              },
            ]}
          />
          <RadioGroup
            name="attemptRule"
            legend="Score-graded work with several attempts"
            value={draft.attemptRule}
            onChange={(v) => setDraft({ ...draft, attemptRule: v as Draft["attemptRule"] })}
            orientation="horizontal"
            options={[
              { value: "best", label: "Best attempt" },
              { value: "latest", label: "Latest attempt" },
            ]}
          />
          <Field
            label="Late penalty (percentage points)"
            htmlFor="late-penalty"
            error={fe.latePenalty}
            hint="Deducted from late score-graded submissions. 0 = none."
          >
            <Input
              id="late-penalty"
              type="number"
              min={0}
              max={100}
              step={1}
              inputMode="decimal"
              className="max-w-28 tabular-nums"
              value={draft.latePenalty}
              onChange={(e) => setDraft({ ...draft, latePenalty: e.target.value })}
            />
          </Field>

          <div className="flex flex-wrap gap-2 border-t border-line pt-4">
            <Button
              onClick={() => {
                setPublishError(null);
                setConfirm(true);
              }}
              disabled={!config || !dirty}
            >
              Publish new version
            </Button>
            <Button
              variant="ghost"
              onClick={() => setDraft(toDraft(current))}
              disabled={!dirty && Object.keys(errors).length === 0}
            >
              Reset to current
            </Button>
          </div>
          {!dirty && config ? (
            <p className="-mt-3 text-xs text-muted">
              These settings match the active version (v{currentVersion}).
            </p>
          ) : null}
        </CardBody>
      </Card>

      <Card padded={false}>
        <CardHeader
          title="Preview"
          titleAs="h2"
          description="Computed from current evidence. Nothing is saved until you publish."
          action={previewing ? <Spinner label="Updating preview" /> : null}
        />
        <CardBody className="space-y-5" aria-live="polite">
          {previewError ? (
            <p
              role="alert"
              className="rounded-lg bg-bad-soft px-3 py-2 text-sm font-medium text-bad"
            >
              {previewError}
            </p>
          ) : null}
          {!preview ? (
            <p className="text-sm text-muted">
              {config ? "Calculating…" : "Fix the highlighted values to see a preview."}
            </p>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-line p-3">
                  <p className="text-xs font-medium text-muted">Grades that change</p>
                  <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-ink">
                    {s!.changed}{" "}
                    <span className="text-sm font-normal text-muted">of {s!.compared}</span>
                  </p>
                </div>
                <div className="rounded-lg border border-line p-3">
                  <p className="text-xs font-medium text-muted">Up / down</p>
                  <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-ink">
                    <span className="text-good">{s!.increased}</span> /{" "}
                    <span className="text-bad">{s!.decreased}</span>
                  </p>
                </div>
                <div className="rounded-lg border border-line p-3">
                  <p className="text-xs font-medium text-muted">Largest change</p>
                  <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-ink">
                    {s!.maxIncrease ? `+${s!.maxIncrease}` : "0"} /{" "}
                    {s!.maxDecrease ? `−${s!.maxDecrease}` : "0"}
                  </p>
                  <p className="text-xs text-muted">mean |change| {s!.meanAbsoluteChange} pts</p>
                </div>
              </div>
              {s!.unchangedBecauseOverridden ? (
                <p className="text-sm text-muted">
                  {s!.unchangedBecauseOverridden} computed grade
                  {s!.unchangedBecauseOverridden === 1 ? "" : "s"} would change but{" "}
                  {s!.unchangedBecauseOverridden === 1 ? "is" : "are"} overridden, so the recorded
                  grade stays the same.
                </p>
              ) : null}
              <Switch
                label="Show unchanged students too"
                checked={showAll}
                onChange={(e) => setShowAll(e.target.checked)}
              />
              {masteryAssignments.length === 0 ? (
                <p className="text-sm text-muted">
                  No mastery- or score-graded assignments in this class yet, so the policy
                  doesn&apos;t affect any grade.
                </p>
              ) : (
                masteryAssignments.map((a) => {
                  const rows = showAll ? a.rows : a.rows.filter((r) => r.before !== r.after);
                  return (
                    <section key={a.id} aria-label={a.title}>
                      <h3 className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink">
                        {a.title}
                        <Badge tone={a.gradingMethod === "mastery" ? "accent" : "neutral"}>
                          {a.gradingMethod === "mastery" ? "Mastery-graded" : "Score-graded"}
                        </Badge>
                      </h3>
                      {rows.length === 0 ? (
                        <p className="mt-1 text-sm text-muted">No change for any student.</p>
                      ) : (
                        <div className="mt-2 overflow-x-auto rounded-lg border border-line">
                          <table className="w-full min-w-[28rem] text-sm">
                            <caption className="sr-only">
                              Before and after grades for {a.title}
                            </caption>
                            <thead className="bg-surface-2 text-xs text-muted">
                              <tr>
                                <th scope="col" className="px-3 py-2 text-left font-semibold">
                                  Student
                                </th>
                                <th scope="col" className="px-3 py-2 text-right font-semibold">
                                  Now
                                </th>
                                <th scope="col" className="px-3 py-2 text-right font-semibold">
                                  With changes
                                </th>
                                <th scope="col" className="px-3 py-2 text-right font-semibold">
                                  Change
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {rows.map((r) => (
                                <tr key={r.studentId} className="border-t border-line">
                                  <th
                                    scope="row"
                                    className="px-3 py-2 text-left font-medium text-ink"
                                  >
                                    {r.studentName}
                                    {r.overridden ? (
                                      <Badge tone="accent" className="ml-2">
                                        Overridden — stays
                                      </Badge>
                                    ) : null}
                                    {r.excused ? <Badge className="ml-2">Excused</Badge> : null}
                                  </th>
                                  <td className="px-3 py-2 text-right tabular-nums text-ink-2">
                                    {fmt(r.before)}
                                  </td>
                                  <td className="px-3 py-2 text-right tabular-nums font-medium text-ink">
                                    {fmt(r.after)}
                                  </td>
                                  <td
                                    className={cn(
                                      "px-3 py-2 text-right tabular-nums",
                                      r.change && r.change > 0
                                        ? "text-good"
                                        : r.change && r.change < 0
                                          ? "text-bad"
                                          : "text-muted",
                                    )}
                                  >
                                    <span className="inline-flex items-center gap-1">
                                      {r.change && r.change > 0 ? (
                                        <ArrowUp aria-hidden="true" className="size-3.5" />
                                      ) : r.change && r.change < 0 ? (
                                        <ArrowDown aria-hidden="true" className="size-3.5" />
                                      ) : (
                                        <Minus aria-hidden="true" className="size-3.5" />
                                      )}
                                      {r.change === null
                                        ? "—"
                                        : `${r.change > 0 ? "+" : ""}${r.change}`}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </section>
                  );
                })
              )}
            </>
          )}
        </CardBody>
      </Card>

      <Card padded={false} className="xl:col-span-2">
        <CardHeader
          title="Version history"
          titleAs="h2"
          description="Every published version is kept. Loading one only fills the editor — publish to make it active again."
        />
        <CardBody>
          {versions.length === 0 ? (
            <p className="text-sm text-muted">
              No versions published yet — the platform default (Mastered 100, Proficient 90,
              Approaching 75, Developing 60, Not started 0; best attempt; no late penalty) applies.
            </p>
          ) : (
            <ol className="divide-y divide-line">
              {versions.map((v) => (
                <li
                  key={v.id}
                  className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink">
                      Version {v.version}
                      {v.isActive ? <Badge tone="good">Active</Badge> : null}
                      <span className="text-xs font-normal text-muted">
                        {v.createdLabel} · {v.createdBy}
                      </span>
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      {LEVELS.map(
                        ({ level, label }) => `${label} ${v.config.levelGrades[level]}%`,
                      ).join(" · ")}{" "}
                      · {v.config.masteryBasis === "highest" ? "highest level" : "current level"} ·{" "}
                      {v.config.attemptRule} attempt · late −{v.config.latePenalty}
                    </p>
                  </div>
                  {!v.isActive ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setDraft(toDraft(v.config))}
                    >
                      Load into editor
                    </Button>
                  ) : null}
                </li>
              ))}
            </ol>
          )}
        </CardBody>
      </Card>

      <Dialog
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Publish this grading policy?"
        description={`${className} · becomes version ${currentVersion + 1}`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(false)} disabled={publishing}>
              Cancel
            </Button>
            <Button onClick={publish} loading={publishing} loadingText="Publishing…">
              Publish
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-sm text-ink-2">
          {s ? (
            <p>
              <strong className="text-ink">{s.changed}</strong> recorded grade
              {s.changed === 1 ? "" : "s"} will change ({s.increased} up, {s.decreased} down).
            </p>
          ) : null}
          <p>
            The gradebook recomputes immediately.{" "}
            {currentVersion
              ? `Version ${currentVersion} is kept in the history; you can load it back into the editor and publish it again.`
              : ""}
          </p>
          <p>
            Student responses, mastery levels and evidence are not changed — only how grades are
            derived from them.
          </p>
          {publishError ? (
            <p role="alert" className="font-medium text-bad">
              {publishError}
            </p>
          ) : null}
        </div>
      </Dialog>
    </div>
  );
}
