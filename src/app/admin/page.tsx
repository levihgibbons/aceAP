import type { Metadata } from "next";
import Link from "next/link";
import { sql } from "drizzle-orm";
import {
  BookOpen,
  Bot,
  Building2,
  ClipboardCheck,
  FileCheck2,
  Plug,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import { getDb } from "@/db/client";
import * as t from "@/db/schema";
import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  DataTable,
  PageHeader,
  Section,
  StatTile,
} from "@/components/ui";
import { requireRole } from "@/modules/auth/session";
import { getTutorStatus } from "@/modules/ai/provider";
import { CONTENT_STATUS_LABEL } from "@/modules/curriculum/queries";

export const metadata: Metadata = { title: "Overview" };

const ROLE_LABEL: Record<string, string> = {
  student: "Students",
  teacher: "Teachers",
  school_admin: "School admins",
  platform_admin: "Platform admins",
};
const LMS_LABEL: Record<string, string> = {
  configured_unverified: "Configured — not verified",
  verified: "Diagnostics passed",
  error: "Diagnostics failed",
  not_configured: "Not configured",
};

export default async function AdminOverviewPage() {
  await requireRole("platform_admin");
  const db = await getDb();
  const n = (r: { n: number }[]) => Number(r[0]?.n ?? 0);

  const [roles, orgs, classes, courses, lessons, questions, latestReviews, lms, demo] =
    await Promise.all([
      db
        .select({ role: t.users.role, n: sql<number>`count(*)::int` })
        .from(t.users)
        .where(sql`${t.users.deletedAt} is null`)
        .groupBy(t.users.role),
      db.select({ n: sql<number>`count(*)::int` }).from(t.organizations),
      db
        .select({
          active: sql<number>`(count(*) filter (where ${t.classes.archivedAt} is null))::int`,
          archived: sql<number>`(count(*) filter (where ${t.classes.archivedAt} is not null))::int`,
        })
        .from(t.classes),
      db
        .select({ status: t.courses.contentStatus, n: sql<number>`count(*)::int` })
        .from(t.courses)
        .groupBy(t.courses.contentStatus),
      db
        .select({
          published: sql<number>`(count(*) filter (where ${t.lessons.publishedVersion} is not null))::int`,
          total: sql<number>`count(*)::int`,
        })
        .from(t.lessons),
      db
        .select({
          published: sql<number>`(count(*) filter (where ${t.questions.publishedVersion} is not null))::int`,
          total: sql<number>`count(*)::int`,
        })
        .from(t.questions),
      db.execute(sql`
      select decision, count(*)::int as n from (
        select distinct on (entity_type, entity_id) decision
        from content_reviews order by entity_type, entity_id, created_at desc
      ) latest group by decision`),
      db
        .select({ status: t.lmsConnections.status, n: sql<number>`count(*)::int` })
        .from(t.lmsConnections)
        .groupBy(t.lmsConnections.status),
      db
        .select({ n: sql<number>`count(*)::int` })
        .from(t.users)
        .where(sql`${t.users.isDemo} and ${t.users.deletedAt} is null`),
    ]);

  const reviewRows =
    (latestReviews as unknown as { rows?: { decision: string; n: number }[] }).rows ??
    (latestReviews as unknown as { decision: string; n: number }[]);
  const reviewCount = (d: string) => Number(reviewRows.find((r) => r.decision === d)?.n ?? 0);
  const awaitingHuman = reviewCount("automated_checks_passed") + reviewCount("changes_requested");
  const totalUsers = roles.reduce((s, r) => s + Number(r.n), 0);
  const tutor = getTutorStatus();
  const lmsTotal = lms.reduce((s, r) => s + Number(r.n), 0);

  return (
    <>
      <PageHeader
        title="Platform overview"
        description="Counts across every organisation. Content, licensing, audit and mastery-policy details are one click away."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Users"
          value={totalUsers}
          hint={`${n(demo)} are seeded demo accounts`}
          icon={<Users />}
        />
        <StatTile
          label="Organisations"
          value={n(orgs)}
          hint={`${classes[0]?.active ?? 0} active classes · ${classes[0]?.archived ?? 0} archived`}
          icon={<Building2 />}
        />
        <StatTile
          label="Published lessons / questions"
          value={`${lessons[0]?.published ?? 0} / ${questions[0]?.published ?? 0}`}
          hint={`of ${lessons[0]?.total ?? 0} lessons and ${questions[0]?.total ?? 0} questions`}
          icon={<BookOpen />}
        />
        <StatTile
          label="Awaiting human review"
          value={awaitingHuman}
          hint="Content items whose latest review is automated checks only, or changes requested"
          icon={<FileCheck2 />}
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card padded={false}>
          <CardHeader title="Users by role" titleAs="h2" />
          <CardBody>
            <DataTable
              caption="Users by role"
              dense
              columns={[
                { key: "role", header: "Role" },
                { key: "n", header: "Accounts", align: "right" },
              ]}
              rows={["student", "teacher", "school_admin", "platform_admin"].map((r) => ({
                id: r,
                role: ROLE_LABEL[r],
                n: Number(roles.find((x) => x.role === r)?.n ?? 0),
              }))}
            />
          </CardBody>
        </Card>
        <Card padded={false}>
          <CardHeader title="Catalog courses by content status" titleAs="h2" />
          <CardBody>
            <DataTable
              caption="Catalog courses by content status"
              dense
              columns={[
                { key: "status", header: "Status" },
                { key: "n", header: "Courses", align: "right" },
              ]}
              rows={(Object.keys(CONTENT_STATUS_LABEL) as t.CourseContentStatus[]).map((s) => ({
                id: s,
                status: CONTENT_STATUS_LABEL[s].label,
                n: Number(courses.find((c) => c.status === s)?.n ?? 0),
              }))}
            />
          </CardBody>
        </Card>
      </div>

      <Section title="Services" className="mt-10">
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <p className="flex items-center gap-2 text-sm font-semibold text-ink">
              <Bot aria-hidden="true" className="size-4 text-muted" />
              AI tutor
            </p>
            <p className="mt-2">
              <Badge tone={tutor.configured ? "good" : "warn"}>
                {tutor.configured ? "Configured" : "Not configured"}
              </Badge>
            </p>
            <p className="mt-2 text-sm text-ink-2">
              {tutor.configured ? `${tutor.provider} · ${tutor.model}` : tutor.reason}
            </p>
          </Card>
          <Card>
            <p className="flex items-center gap-2 text-sm font-semibold text-ink">
              <Plug aria-hidden="true" className="size-4 text-muted" />
              Canvas connections
            </p>
            <p className="mt-2 font-display text-2xl font-semibold tabular-nums text-ink">
              {lmsTotal}
            </p>
            <p className="mt-1 text-sm text-ink-2">
              {lmsTotal === 0
                ? "None configured. No organisation is connected to Canvas."
                : lms.map((r) => `${r.n} ${LMS_LABEL[r.status] ?? r.status}`).join(" · ")}
            </p>
          </Card>
          <Card>
            <p className="flex items-center gap-2 text-sm font-semibold text-ink">
              <ClipboardCheck aria-hidden="true" className="size-4 text-muted" />
              Content reviews (latest per item)
            </p>
            <ul className="mt-2 space-y-1 text-sm text-ink-2">
              <li>{reviewCount("approved")} approved by a human reviewer</li>
              <li>
                {reviewCount("automated_checks_passed")} automated checks passed — human review
                pending
              </li>
              <li>{reviewCount("changes_requested")} changes requested</li>
            </ul>
          </Card>
        </div>
      </Section>

      <Section title="Admin tools" className="mt-10">
        <ul className="grid gap-3 sm:grid-cols-2">
          {[
            {
              href: "/admin/content",
              label: "Content review",
              desc: "Provenance, versions and review status for every lesson and question.",
              icon: FileCheck2,
            },
            {
              href: "/admin/licensing",
              label: "Licensing registry",
              desc: "Third-party sources and their permitted use.",
              icon: BookOpen,
            },
            {
              href: "/admin/audit",
              label: "Audit log",
              desc: "Who changed what, when.",
              icon: ClipboardCheck,
            },
            {
              href: "/admin/policies",
              label: "Mastery policy",
              desc: "Platform default thresholds and evidence rules, with version history.",
              icon: SlidersHorizontal,
            },
          ].map((l) => (
            <li key={l.href}>
              <Card interactive className="h-full">
                <Link
                  href={l.href}
                  className="flex items-start gap-3 after:absolute after:inset-0 after:content-['']"
                >
                  <l.icon aria-hidden="true" className="mt-0.5 size-5 text-accent" />
                  <span>
                    <span className="block font-medium text-ink">{l.label}</span>
                    <span className="mt-0.5 block text-sm text-muted">{l.desc}</span>
                  </span>
                </Link>
              </Card>
            </li>
          ))}
        </ul>
      </Section>
    </>
  );
}
