import type { Metadata } from "next";
import { desc, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import * as t from "@/db/schema";
import { MasteryPolicyEditor } from "@/components/admin/MasteryPolicyEditor";
import { REQUIREMENTS } from "@/components/admin/mastery-requirements";
import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  DataTable,
  KeyValue,
  PageHeader,
  Section,
  formatDate,
} from "@/components/ui";
import { requireRole } from "@/modules/auth/session";
import { DEFAULT_MASTERY_POLICY } from "@/modules/mastery/policy";
import type { MasteryPolicyConfig } from "@/modules/mastery/types";
import { publishMasteryPolicyAction } from "./actions";

export const metadata: Metadata = { title: "Mastery policy" };

const MODE_LABEL: Record<string, string> = {
  lesson_check: "Lesson check",
  guided_practice: "Guided practice",
  skill_quiz: "Skill quiz",
  lesson_quiz: "Lesson quiz",
  unit_test: "Unit test",
  course_review: "Course review",
  exam_practice: "Exam practice",
  custom: "Teacher-built set",
};

function levelSummary(c: MasteryPolicyConfig): string {
  return `Approaching ≥ ${c.levels.approaching.minEstimate} · Proficient ≥ ${c.levels.proficient.minEstimate} (${c.levels.proficient.minIndependentCorrect} indep. correct) · Mastered ≥ ${c.levels.mastered.minEstimate} (${c.levels.mastered.minIndependentCorrect} indep. correct, ${c.levels.mastered.minDistinctSittings} sittings)`;
}

export default async function MasteryPoliciesPage() {
  await requireRole("platform_admin");
  const db = await getDb();
  const history = await db
    .select()
    .from(t.masteryPolicies)
    .where(isNull(t.masteryPolicies.organizationId))
    .orderBy(desc(t.masteryPolicies.version));
  const active = history.find((p) => p.isActive) ?? null;
  const config: MasteryPolicyConfig = active?.config ?? DEFAULT_MASTERY_POLICY;
  const [{ states }] = await db
    .select({ states: sql<number>`count(*)::int` })
    .from(t.masteryStates);
  const [{ orgPolicies }] = await db
    .select({ orgPolicies: sql<number>`count(distinct ${t.masteryPolicies.organizationId})::int` })
    .from(t.masteryPolicies)
    .where(isNotNull(t.masteryPolicies.organizationId));
  const creatorIds = [
    ...new Set(history.map((h) => h.createdBy).filter((x): x is string => Boolean(x))),
  ];
  const creators = creatorIds.length
    ? await db
        .select({ id: t.users.id, name: t.users.name })
        .from(t.users)
        .where(inArray(t.users.id, creatorIds))
    : [];
  const nameOf = new Map(creators.map((c) => [c.id, c.name]));

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Mastery policy" }]}
        title="Platform mastery policy"
        description="The default rules that turn evidence into mastery levels for every student whose school hasn't published its own policy. These are product defaults, not scientifically validated thresholds."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
        <Card padded={false}>
          <CardHeader
            title={
              active
                ? `${active.name} — version ${active.version}`
                : "Built-in default (not stored yet)"
            }
            titleAs="h2"
            description={
              active
                ? `Published ${formatDate(active.createdAt, { withTime: true })}${active.createdBy ? ` by ${nameOf.get(active.createdBy) ?? "an admin"}` : " by the system"}.`
                : "No platform policy row exists yet; the engine creates version 1 from these values on first use."
            }
          />
          <CardBody>
            <DataTable
              caption="Level requirements (a level is awarded only when every requirement is met; levels are checked from Mastered down)"
              showCaption
              dense
              columns={[
                {
                  key: "req",
                  header: "Requirement",
                  rowHeader: true,
                  className: "whitespace-normal",
                },
                { key: "approaching", header: "Approaching", align: "right" },
                { key: "proficient", header: "Proficient", align: "right" },
                { key: "mastered", header: "Mastered", align: "right" },
              ]}
              rows={REQUIREMENTS.map((r) => ({
                id: r.key,
                req: r.label,
                approaching: r.levels.includes("approaching")
                  ? String((config.levels.approaching as Record<string, number>)[r.key])
                  : "—",
                proficient: String(config.levels.proficient[r.key]),
                mastered: String(config.levels.mastered[r.key]),
              }))}
            />
          </CardBody>
        </Card>
        <Card>
          <h2 className="font-display text-[1.0625rem] font-semibold text-ink">Scope</h2>
          <KeyValue
            className="mt-3"
            items={[
              { label: "Mastery states", value: states },
              { label: "Schools with own policy", value: orgPolicies },
              { label: "Correct threshold", value: config.correctThreshold },
              { label: "Prior (α, β)", value: `${config.prior.alpha}, ${config.prior.beta}` },
            ]}
          />
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card padded={false}>
          <CardHeader title="Evidence weight by activity" titleAs="h3" />
          <CardBody>
            <KeyValue
              items={Object.entries(config.modeWeights).map(([k, v]) => ({
                label: MODE_LABEL[k] ?? k,
                value: `× ${v}`,
              }))}
            />
          </CardBody>
        </Card>
        <Card padded={false}>
          <CardHeader title="Assistance and difficulty" titleAs="h3" />
          <CardBody>
            <KeyValue
              items={[
                { label: "One hint", value: `× ${config.assistance.oneHint}` },
                { label: "Several hints", value: `× ${config.assistance.multipleHints}` },
                { label: "AI tutor used", value: `× ${config.assistance.tutor}` },
                { label: "Solution viewed", value: `× ${config.assistance.solutionViewed}` },
                { label: "Retry after feedback", value: `× ${config.retryAfterFeedback}` },
                { label: "Difficulty 1–5", value: config.difficultyWeights.join(" · ") },
                { label: "Repeat exposure", value: config.repeatExposure.join(" · ") },
              ]}
            />
          </CardBody>
        </Card>
        <Card padded={false}>
          <CardHeader title="Retention (needs review)" titleAs="h3" />
          <CardBody>
            <KeyValue
              items={[
                {
                  label: "Review intervals (days)",
                  value: config.retention.intervalsDays.join(", "),
                },
                { label: "Relearn after a miss", value: `${config.retention.relearnDays} day(s)` },
                {
                  label: "Recent-miss rule",
                  value: `${config.retention.recentMissesForReview} of last ${config.retention.recentWindow}`,
                },
                {
                  label: "Recency decay",
                  value: `${config.recencyDecayPerLaterItem} (floor ${config.recencyFloor})`,
                },
              ]}
            />
          </CardBody>
        </Card>
      </div>

      <Section
        title="Edit level thresholds and evidence rules"
        description="Weights, assistance factors and retention are kept from the active version. Validation enforces bounds and Mastered ≥ Proficient ≥ Approaching."
        className="mt-10"
      >
        <Card>
          <MasteryPolicyEditor
            current={config.levels}
            currentName={active?.name ?? "AceAP default"}
            currentVersion={active?.version ?? 0}
            studentStates={Number(states)}
            action={publishMasteryPolicyAction}
          />
        </Card>
      </Section>

      <Section
        title="Version history"
        description="Every version is kept; snapshots record which version produced each result."
        className="mt-10"
      >
        <DataTable
          caption="Platform mastery policy versions"
          columns={[
            { key: "version", header: "Version", rowHeader: true },
            { key: "name", header: "Name" },
            { key: "levels", header: "Levels", className: "whitespace-normal min-w-80" },
            { key: "by", header: "Published by" },
            { key: "at", header: "Date" },
          ]}
          rows={history.map((h) => ({
            id: h.id,
            version: (
              <span className="inline-flex items-center gap-2">
                v{h.version}
                {h.isActive ? <Badge tone="good">Active</Badge> : null}
              </span>
            ),
            name: h.name,
            levels: <span className="text-xs">{levelSummary(h.config)}</span>,
            by: h.createdBy ? (nameOf.get(h.createdBy) ?? "Deleted user") : "System",
            at: formatDate(h.createdAt, { withTime: true }),
          }))}
          empty={
            <p className="rounded-card border border-line p-4 text-sm text-muted">
              No versions stored yet.
            </p>
          }
        />
      </Section>
    </>
  );
}
