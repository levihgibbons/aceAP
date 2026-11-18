"use client";
/**
 * New-assignment form. Every field is controlled so a validation error never
 * wipes what the teacher typed (React resets uncontrolled fields after an
 * action). Dates are entered in the teacher's local time and submitted as ISO.
 */
import { useActionState, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Info, Users } from "lucide-react";
import {
  Button,
  ButtonLink,
  Card,
  CardBody,
  CardHeader,
  Checkbox,
  Field,
  Input,
  RadioGroup,
  SegmentedProgress,
  Select,
  Spinner,
  Textarea,
} from "@/components/ui";
import { cn } from "@/lib/cn";
import type { MasteryLevel } from "@/modules/mastery/types";
import type { ActionState } from "./action-state";
import { AI_LABEL, GRADING_EXPLANATION, GRADING_LABEL, KIND_LABEL } from "./labels";

type Kind = "lesson" | "skill_practice" | "assessment";
type Grading = "score" | "mastery" | "completion";

export interface AssignmentFormData {
  classes: { id: string; name: string; detail: string }[];
  classId: string;
  courseName: string;
  lessons: {
    unit: string;
    lessons: { id: string; title: string; minutes: number; published: boolean }[];
  }[];
  objectives: {
    id: string;
    code: string;
    description: string;
    unit: string;
    skills: {
      id: string;
      name: string;
      questionCount: number;
      distribution: Record<MasteryLevel, number>;
    }[];
  }[];
  assessments: {
    id: string;
    title: string;
    kind: string;
    questionCount: number;
    timeLimitMinutes: number | null;
  }[];
  roster: { id: string; name: string }[];
  prefill: {
    kind: Kind;
    skillIds: string[];
    studentIds: string[];
    lessonId: string | null;
    assessmentId: string | null;
  };
  ignoredPrefill: boolean;
}

const GRADING_FOR: Record<Kind, Grading[]> = {
  lesson: ["completion", "mastery"],
  skill_practice: ["mastery", "score", "completion"],
  assessment: ["score", "mastery", "completion"],
};

const ASSESSMENT_KIND: Record<string, string> = {
  exercise: "Exercise",
  skill_quiz: "Skill quiz",
  lesson_quiz: "Lesson quiz",
  unit_test: "Unit test",
  course_review: "Review",
};

/** "2026-11-17T15:30" (local) → ISO, or "" when empty/invalid. */
function localToIso(value: string): string {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

const initial: ActionState = {};

export function AssignmentForm({
  data,
  action,
}: {
  data: AssignmentFormData;
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(action, initial);
  const [switching, startSwitch] = useTransition();

  const allSkills = useMemo(
    () => new Map(data.objectives.flatMap((o) => o.skills.map((s) => [s.id, s] as const))),
    [data.objectives],
  );
  const allLessons = useMemo(
    () => new Map(data.lessons.flatMap((g) => g.lessons.map((l) => [l.id, l] as const))),
    [data.lessons],
  );

  const [kind, setKind] = useState<Kind>(data.prefill.kind);
  const [lessonId, setLessonId] = useState(data.prefill.lessonId ?? "");
  const [assessmentId, setAssessmentId] = useState(data.prefill.assessmentId ?? "");
  const [skillIds, setSkillIds] = useState<string[]>(data.prefill.skillIds);
  const [questionCount, setQuestionCount] = useState("6");
  const [titleInput, setTitleInput] = useState("");
  const [titleTouched, setTitleTouched] = useState(false);
  const [instructions, setInstructions] = useState("");
  const [opensLocal, setOpensLocal] = useState("");
  const [dueLocal, setDueLocal] = useState("");
  const [maxAttempts, setMaxAttempts] = useState("");
  const [grading, setGrading] = useState<Grading>(GRADING_FOR[data.prefill.kind][0]);
  const [points, setPoints] = useState("100");
  const [aiPolicy, setAiPolicy] = useState<"allowed" | "hints_only" | "disabled">(
    data.prefill.kind === "assessment" ? "disabled" : "hints_only",
  );
  const [feedback, setFeedback] = useState<"immediate" | "after_submit">("after_submit");
  const [audience, setAudience] = useState<"whole" | "selected">(
    data.prefill.studentIds.length ? "selected" : "whole",
  );
  const [students, setStudents] = useState<string[]>(data.prefill.studentIds);

  const fe = state.fieldErrors ?? {};

  const suggested = (() => {
    if (kind === "lesson")
      return lessonId && allLessons.get(lessonId) ? `Read: ${allLessons.get(lessonId)!.title}` : "";
    if (kind === "assessment")
      return data.assessments.find((a) => a.id === assessmentId)?.title ?? "";
    if (skillIds.length === 0) return "";
    const first = allSkills.get(skillIds[0])?.name ?? "skills";
    return skillIds.length === 1
      ? `Practice: ${first}`
      : `Practice: ${first} + ${skillIds.length - 1} more`;
  })();
  const title = titleTouched ? titleInput : suggested;

  const changeKind = (k: Kind) => {
    setKind(k);
    if (!GRADING_FOR[k].includes(grading)) setGrading(GRADING_FOR[k][0]);
    if (k === "assessment") setAiPolicy("disabled");
  };

  const toggle = (list: string[], id: string, on: boolean) =>
    on ? [...new Set([...list, id])] : list.filter((x) => x !== id);
  const assignedCount = audience === "whole" ? data.roster.length : students.length;
  const selectedAssessment = data.assessments.find((a) => a.id === assessmentId);

  return (
    <form action={formAction} noValidate className="space-y-6">
      <input type="hidden" name="classId" value={data.classId} />
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="dueAt" value={localToIso(dueLocal)} />
      <input type="hidden" name="availableFrom" value={localToIso(opensLocal)} />
      <input type="hidden" name="audience" value={audience} />

      {state.error ? (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-lg border border-bad/25 bg-bad-soft px-3.5 py-3 text-sm text-bad"
        >
          <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <p>{state.error}</p>
        </div>
      ) : null}
      {data.ignoredPrefill ? (
        <div className="flex items-start gap-2.5 rounded-lg bg-info-soft px-3.5 py-3 text-sm text-info">
          <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <p>
            Some pre-selected skills, students or content don&apos;t belong to this class and were
            left out.
          </p>
        </div>
      ) : null}

      <Card padded={false}>
        <CardHeader
          title="What to assign"
          description={`From the ${data.courseName} course.`}
          titleAs="h2"
        />
        <CardBody className="space-y-6">
          <Field label="Class" htmlFor="as-class" error={fe.classId}>
            <div className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <Select
                  id="as-class"
                  value={data.classId}
                  onChange={(e) =>
                    startSwitch(() =>
                      router.push(
                        `/teacher/assignments/new?class=${encodeURIComponent(e.target.value)}&kind=${kind}`,
                      ),
                    )
                  }
                  aria-describedby="as-class-hint"
                >
                  {data.classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} — {c.detail}
                    </option>
                  ))}
                </Select>
              </div>
              {switching ? <Spinner label="Loading class" /> : null}
            </div>
          </Field>
          <p id="as-class-hint" className="-mt-4 text-xs text-muted">
            Changing the class reloads its lessons, skills and roster; selections below are cleared.
          </p>

          <RadioGroup
            name="kind-choice"
            legend="Type"
            variant="cards"
            orientation="horizontal"
            value={kind}
            onChange={(v) => changeKind(v as Kind)}
            options={[
              {
                value: "lesson",
                label: KIND_LABEL.lesson,
                description: "Read a lesson and answer its checks.",
              },
              {
                value: "skill_practice",
                label: KIND_LABEL.skill_practice,
                description: "Adaptive question set on chosen skills.",
              },
              {
                value: "assessment",
                label: KIND_LABEL.assessment,
                description: "A fixed quiz or unit test.",
              },
            ]}
            error={fe.kind}
          />

          {kind === "lesson" ? (
            <Field label="Lesson" htmlFor="as-lesson" error={fe.lessonId} required>
              <Select
                id="as-lesson"
                name="lessonId"
                value={lessonId}
                onChange={(e) => setLessonId(e.target.value)}
              >
                <option value="">Choose a lesson…</option>
                {data.lessons.map((g) => (
                  <optgroup key={g.unit} label={g.unit}>
                    {g.lessons.map((l) => (
                      <option key={l.id} value={l.id} disabled={!l.published}>
                        {l.title} ({l.minutes} min){l.published ? "" : " — not published"}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </Select>
            </Field>
          ) : null}

          {kind === "assessment" ? (
            <Field
              label="Quiz or test"
              htmlFor="as-assessment"
              error={fe.assessmentId}
              required
              hint={
                selectedAssessment
                  ? `${selectedAssessment.questionCount} questions${selectedAssessment.timeLimitMinutes ? ` · ${selectedAssessment.timeLimitMinutes}-minute limit` : " · untimed"}`
                  : undefined
              }
            >
              <Select
                id="as-assessment"
                name="assessmentId"
                value={assessmentId}
                onChange={(e) => setAssessmentId(e.target.value)}
              >
                <option value="">Choose a quiz or test…</option>
                {data.assessments.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.title} — {ASSESSMENT_KIND[a.kind] ?? a.kind}, {a.questionCount} q
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}

          {kind === "skill_practice" ? (
            <fieldset aria-describedby={fe.skillIds ? "as-skills-error" : "as-skills-hint"}>
              <legend className="text-sm font-medium text-ink">
                Skills
                <span aria-hidden="true" className="ml-0.5 text-bad">
                  *
                </span>
              </legend>
              <p id="as-skills-hint" className="mt-1 text-xs text-muted">
                Bars show this class&apos;s current mastery on each skill (grey = no evidence yet).{" "}
                {skillIds.length} selected (max 12).
              </p>
              {fe.skillIds ? (
                <p id="as-skills-error" className="mt-1 text-xs font-medium text-bad">
                  {fe.skillIds}
                </p>
              ) : null}
              <div className="mt-3 max-h-[28rem] space-y-4 overflow-y-auto rounded-lg border border-line p-3 sm:p-4">
                {data.objectives.length === 0 ? (
                  <p className="text-sm text-muted">This course has no skills yet.</p>
                ) : null}
                {data.objectives.map((o) => (
                  <div key={o.id}>
                    <p className="text-xs font-semibold text-muted">
                      {o.unit} · {o.code}
                    </p>
                    <p className="mb-2 text-sm text-ink-2">{o.description}</p>
                    <ul className="space-y-2">
                      {o.skills.map((s) => {
                        const d = s.distribution;
                        const total = Object.values(d).reduce((a, b) => a + b, 0);
                        const strong = d.proficient + d.mastered;
                        return (
                          <li
                            key={`${o.id}-${s.id}`}
                            className="grid gap-2 sm:grid-cols-[1fr_12rem] sm:items-center"
                          >
                            <Checkbox
                              id={`skill-${o.id}-${s.id}`}
                              name="skillIds"
                              value={s.id}
                              checked={skillIds.includes(s.id)}
                              onChange={(e) =>
                                setSkillIds((prev) => toggle(prev, s.id, e.target.checked))
                              }
                              disabled={!skillIds.includes(s.id) && skillIds.length >= 12}
                              label={s.name}
                              description={`${s.questionCount} questions in the bank`}
                            />
                            <div>
                              <SegmentedProgress
                                size="sm"
                                label={`Class mastery on ${s.name}`}
                                total={total}
                                segments={(
                                  ["developing", "approaching", "proficient", "mastered"] as const
                                ).map((l) => ({ level: l, count: d[l] }))}
                              />
                              <p className="mt-1 text-[0.6875rem] text-muted">
                                {strong} of {total} proficient+ · {d.not_started} no evidence
                              </p>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
              <Field
                label="Questions per set"
                htmlFor="as-qcount"
                error={fe.questionCount}
                hint="3–20. Students get a fresh mix on each attempt."
                className="mt-4 max-w-48"
              >
                <Input
                  id="as-qcount"
                  name="questionCount"
                  type="number"
                  min={3}
                  max={20}
                  inputMode="numeric"
                  value={questionCount}
                  onChange={(e) => setQuestionCount(e.target.value)}
                />
              </Field>
            </fieldset>
          ) : null}

          <Field
            label="Title"
            htmlFor="as-title"
            error={fe.title}
            required
            hint={
              titleTouched && suggested && title !== suggested
                ? undefined
                : "Suggested from your selection — edit freely."
            }
          >
            <Input
              id="as-title"
              name="title"
              value={title}
              maxLength={120}
              onChange={(e) => {
                setTitleTouched(true);
                setTitleInput(e.target.value);
              }}
            />
          </Field>
          {titleTouched && suggested && title !== suggested ? (
            <button
              type="button"
              className="-mt-4 text-xs font-medium text-accent underline-offset-4 hover:underline"
              onClick={() => setTitleTouched(false)}
            >
              Use suggested title: “{suggested}”
            </button>
          ) : null}

          <Field
            label="Instructions"
            htmlFor="as-instructions"
            error={fe.instructions}
            hint="Optional. Shown to students above the work. Max 2000 characters."
          >
            <Textarea
              id="as-instructions"
              name="instructions"
              rows={3}
              maxLength={2000}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
            />
          </Field>
        </CardBody>
      </Card>

      <Card padded={false}>
        <CardHeader
          title="When and how"
          titleAs="h2"
          description="Times are in your local time zone."
        />
        <CardBody className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Opens"
              htmlFor="as-opens"
              error={fe.availableFrom}
              hint="Leave empty to open now."
            >
              <Input
                id="as-opens"
                type="datetime-local"
                value={opensLocal}
                onChange={(e) => setOpensLocal(e.target.value)}
              />
            </Field>
            <Field
              label="Due"
              htmlFor="as-due"
              error={fe.dueAt}
              hint="Leave empty for no due date (nothing is ever marked missing)."
            >
              <Input
                id="as-due"
                type="datetime-local"
                value={dueLocal}
                onChange={(e) => setDueLocal(e.target.value)}
              />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Attempts allowed"
              htmlFor="as-attempts"
              error={fe.maxAttempts}
              hint="1–10. Leave empty for unlimited."
            >
              <Input
                id="as-attempts"
                name="maxAttempts"
                type="number"
                min={1}
                max={10}
                inputMode="numeric"
                value={maxAttempts}
                onChange={(e) => setMaxAttempts(e.target.value)}
              />
            </Field>
            <Field
              label="Points"
              htmlFor="as-points"
              error={fe.points}
              hint="Weight in the student's average (1–1000)."
            >
              <Input
                id="as-points"
                name="points"
                type="number"
                min={1}
                max={1000}
                inputMode="numeric"
                value={points}
                onChange={(e) => setPoints(e.target.value)}
              />
            </Field>
          </div>

          <RadioGroup
            name="gradingMethod"
            legend="Grading method"
            variant="cards"
            value={grading}
            onChange={(v) => setGrading(v as Grading)}
            options={GRADING_FOR[kind].map((g) => ({
              value: g,
              label: GRADING_LABEL[g],
              description:
                kind === "lesson" && g === "completion"
                  ? "Full credit once the student completes the lesson."
                  : GRADING_EXPLANATION[g],
            }))}
            error={fe.gradingMethod}
          />

          <Field label="Assistance while working" htmlFor="as-ai" error={fe.aiPolicy}>
            <Select
              id="as-ai"
              name="aiPolicy"
              value={aiPolicy}
              onChange={(e) => setAiPolicy(e.target.value as typeof aiPolicy)}
            >
              {(["allowed", "hints_only", "disabled"] as const).map((p) => (
                <option key={p} value={p}>
                  {AI_LABEL[p]}
                </option>
              ))}
            </Select>
          </Field>

          {kind !== "skill_practice" ? (
            <RadioGroup
              name="feedback"
              legend="When students see correct answers"
              value={feedback}
              onChange={(v) => setFeedback(v as typeof feedback)}
              orientation="horizontal"
              options={[
                {
                  value: "after_submit",
                  label: "After they submit",
                  description: "Recommended for quizzes and tests.",
                },
                { value: "immediate", label: "After each answer" },
              ]}
              error={fe.feedback}
            />
          ) : (
            <p className="text-sm text-muted">Practice always gives feedback after each answer.</p>
          )}
        </CardBody>
      </Card>

      <Card padded={false}>
        <CardHeader title="Who gets it" titleAs="h2" />
        <CardBody className="space-y-4">
          <RadioGroup
            name="audience-choice"
            legend="Assign to"
            hideLegend
            orientation="horizontal"
            variant="cards"
            value={audience}
            onChange={(v) => setAudience(v as typeof audience)}
            options={[
              {
                value: "whole",
                label: "Whole class",
                description: `All ${data.roster.length} current students, and anyone who joins later.`,
              },
              {
                value: "selected",
                label: "Selected students",
                description: "Only the students you tick.",
              },
            ]}
          />
          {audience === "selected" ? (
            <fieldset aria-describedby={fe.studentIds ? "as-students-error" : undefined}>
              <legend className="sr-only">Students</legend>
              {fe.studentIds ? (
                <p id="as-students-error" className="mb-2 text-xs font-medium text-bad">
                  {fe.studentIds}
                </p>
              ) : null}
              {data.roster.length === 0 ? (
                <p className="text-sm text-muted">No students have joined this class yet.</p>
              ) : (
                <>
                  <div className="mb-2 flex gap-3 text-xs">
                    <button
                      type="button"
                      className="font-medium text-accent hover:underline"
                      onClick={() => setStudents(data.roster.map((s) => s.id))}
                    >
                      Select all
                    </button>
                    <button
                      type="button"
                      className="font-medium text-accent hover:underline"
                      onClick={() => setStudents([])}
                    >
                      Clear
                    </button>
                  </div>
                  <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {data.roster.map((s) => (
                      <li key={s.id}>
                        <Checkbox
                          id={`stu-${s.id}`}
                          name="studentIds"
                          value={s.id}
                          checked={students.includes(s.id)}
                          onChange={(e) =>
                            setStudents((prev) => toggle(prev, s.id, e.target.checked))
                          }
                          label={s.name}
                        />
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </fieldset>
          ) : null}
        </CardBody>
      </Card>

      <div className="flex flex-col-reverse gap-3 rounded-card border border-line bg-surface-2 p-4 sm:flex-row sm:items-center sm:justify-between">
        <p
          className={cn(
            "flex items-center gap-2 text-sm font-medium",
            assignedCount === 0 ? "text-warn" : "text-ink",
          )}
          aria-live="polite"
        >
          <Users aria-hidden="true" className="size-4" />
          {assignedCount === 0
            ? audience === "whole"
              ? "No students yet — it will reach students as they join."
              : "No students selected."
            : `Assigned to ${assignedCount} student${assignedCount === 1 ? "" : "s"}`}
        </p>
        <div className="flex gap-2">
          <ButtonLink variant="ghost" href="/teacher/assignments">
            Cancel
          </ButtonLink>
          <Button type="submit" loading={pending} loadingText="Assigning…">
            Assign
          </Button>
        </div>
      </div>
    </form>
  );
}
