import type { Metadata } from "next";
import Link from "next/link";
import { asc } from "drizzle-orm";
import {
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
  KeyRound,
  Plug,
  ShieldAlert,
} from "lucide-react";
import { getDb } from "@/db/client";
import * as t from "@/db/schema";
import { ConnectionCard } from "@/components/integrations/ConnectionCard";
import { CONNECTION_STATUS } from "@/components/integrations/status";
import { CopyField } from "@/components/integrations/CopyField";
import { NewConnection } from "@/components/integrations/NewConnection";
import { RetryJobButton } from "@/components/integrations/RetryJobButton";
import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  DataTable,
  EmptyState,
  PageHeader,
  Section,
  TabLinks,
  formatDate,
  type BadgeTone,
} from "@/components/ui";
import { requireStaff } from "@/modules/auth/session";
import { staffOrganizations } from "@/modules/classrooms/service";
import { getIntegrationOverview, listSyncJobs } from "@/modules/integrations/lms/service";
import { urlPolicyFromEnv } from "@/modules/integrations/lms/lti/urlPolicy";
import type { SyncStatus } from "@/db/schema";
import {
  canvasDefaultsAction,
  retrySyncJobAction,
  runDiagnosticsAction,
  saveConnectionAction,
} from "./actions";

export const metadata: Metadata = { title: "Integrations" };

const JOB_TONE: Record<SyncStatus, BadgeTone> = {
  pending: "info",
  synced: "good",
  failed: "bad",
  blocked: "warn",
};
const STATUSES: SyncStatus[] = ["pending", "synced", "failed", "blocked"];

export default async function IntegrationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireStaff();
  const params = await searchParams;
  const statusFilter = STATUSES.find((s) => s === params.status);
  const db = await getDb();
  const memberships = await staffOrganizations(db, user.id);
  const orgs =
    memberships.length > 0 || user.role !== "platform_admin"
      ? memberships.map((m) => ({ id: m.id, name: m.name, role: m.role as string }))
      : (
          await db
            .select({ id: t.organizations.id, name: t.organizations.name })
            .from(t.organizations)
            .orderBy(asc(t.organizations.name))
        ).map((o) => ({ ...o, role: "platform admin" }));

  const allowedHosts = urlPolicyFromEnv().allowedHosts.join(", ");
  const data = await Promise.all(
    orgs.map(async (o) => ({
      org: o,
      overview: await getIntegrationOverview(o.id),
      jobs: await listSyncJobs(o.id, { status: statusFilter, limit: 100, logLines: 3 }),
    })),
  );

  return (
    <>
      <PageHeader
        title="Integrations"
        description="Connect AceAP to your school's Canvas with LTI 1.3 so teachers can launch AceAP from Canvas and send grades back. Nothing is sent to Canvas until a connection is configured and verified."
      />

      <Card padded={false} className="mb-8">
        <CardHeader title="Where this stands today" titleAs="h2" />
        <CardBody className="grid gap-6 md:grid-cols-3">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-ink">
              <CheckCircle2 aria-hidden="true" className="size-4 text-good" />
              Works today
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-2">
              <li>
                A standards-based LTI 1.3 / LTI Advantage implementation (launch validation, deep
                linking, grade passback, roster) written from the 1EdTech specs and Canvas docs.
              </li>
              <li>
                Tested only against an in-repo mock platform. It has never exchanged a message with
                a real Canvas.
              </li>
              <li>
                Storing a connection, running diagnostics and reviewing grade-sync jobs on this
                page.
              </li>
            </ul>
          </div>
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-ink">
              <KeyRound aria-hidden="true" className="size-4 text-warn" />
              Needs your Canvas admin
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-2">
              <li>
                Creating an LTI Developer Key with the AceAP URLs below, enabling it and installing
                the app.
              </li>
              <li>Giving you the Client ID and Deployment ID to enter here.</li>
              <li>Your AceAP host setting the tool signing key on the server.</li>
            </ul>
          </div>
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-ink">
              <ShieldAlert aria-hidden="true" className="size-4 text-info" />
              Teacher-approved, never automatic
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-2">
              <li>
                Teachers send grades from the gradebook (&ldquo;Send grades to Canvas&rdquo;) once the
                connection has passed diagnostics and the assignment is linked from Canvas. Nothing is
                queued when a grade changes.
              </li>
              <li>
                Grades Canvas couldn&apos;t accept yet are retried by the background sync (
                <code className="font-mono text-xs">npm run lms:sync -- --apply</code>) when your host
                schedules it.
              </li>
              <li>
                A grade is shown as synced only after Canvas confirms it. Until then it is pending,
                blocked or failed — never assumed.
              </li>
            </ul>
          </div>
        </CardBody>
      </Card>

      {orgs.length === 0 ? (
        <EmptyState
          icon={<Plug />}
          title="No school or organisation"
          description="Integrations are set up per school. Your account isn't a teacher or admin of any organisation yet."
        />
      ) : (
        data.map(({ org, overview, jobs }) => {
          const st = CONNECTION_STATUS[overview.status];
          return (
            <Section
              key={org.id}
              id={`org-${org.id}`}
              title={org.name}
              description={`Your role: ${org.role.replace("_", " ")}`}
              className="mt-10"
              action={
                <Badge
                  tone={st.tone}
                  icon={
                    overview.status === "not_configured" ? (
                      <CircleDashed className="size-3" />
                    ) : undefined
                  }
                >
                  {overview.status === "not_configured" ? "NOT CONFIGURED" : st.label}
                </Badge>
              }
            >
              <p className="mb-5 text-sm text-ink-2">{overview.statusLabel}</p>
              {overview.warnings.length ? (
                <ul className="mb-6 space-y-2" aria-label="Warnings">
                  {overview.warnings.map((w, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 rounded-lg bg-warn-soft px-3 py-2 text-sm text-warn"
                    >
                      <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                      <span>{w.message}</span>
                    </li>
                  ))}
                </ul>
              ) : null}

              <div className="grid gap-6 lg:grid-cols-2">
                <Card padded={false}>
                  <CardHeader
                    title="1. Give these to your Canvas admin"
                    titleAs="h3"
                    description="Paste them into a new LTI Developer Key (Admin → Developer Keys → + Developer Key → LTI Key)."
                  />
                  <CardBody className="space-y-4">
                    <CopyField
                      id={`login-${org.id}`}
                      label="OpenID Connect Initiation URL"
                      value={overview.toolEndpoints.loginUrl}
                    />
                    <CopyField
                      id={`launch-${org.id}`}
                      label="Target Link URI and Redirect URI"
                      value={overview.toolEndpoints.launchUrl}
                    />
                    <CopyField
                      id={`jwks-${org.id}`}
                      label="Public JWK URL"
                      value={overview.toolEndpoints.jwksUrl}
                    />
                    <div className="rounded-lg border border-line p-3 text-sm">
                      <p className="font-medium text-ink">AceAP tool signing key</p>
                      {overview.toolKey.configured ? (
                        <p className="mt-1 flex items-center gap-2 text-good">
                          <CheckCircle2 aria-hidden="true" className="size-4" />
                          Configured (key id{" "}
                          <code className="font-mono text-xs">{overview.toolKey.kid}</code>). Only
                          the public half is ever published.
                        </p>
                      ) : (
                        <p className="mt-1 text-ink-2">
                          <span className="font-medium text-warn">Not configured.</span> Your AceAP
                          host must set{" "}
                          <code className="rounded bg-sunken px-1 font-mono text-xs">
                            LTI_TOOL_PRIVATE_KEY
                          </code>{" "}
                          (an RSA private key, PEM) and optionally{" "}
                          <code className="rounded bg-sunken px-1 font-mono text-xs">
                            LTI_TOOL_KEY_ID
                          </code>{" "}
                          on the server. Until then the JWKS above is empty and launches can&apos;t
                          start.
                        </p>
                      )}
                      {overview.toolEndpoints.launchUrl.startsWith("http://") ? (
                        <p className="mt-2 text-xs text-muted">
                          These URLs come from <code className="font-mono">APP_BASE_URL</code> and
                          use http://. Canvas needs the deployed HTTPS address.
                        </p>
                      ) : null}
                    </div>
                  </CardBody>
                </Card>

                <Card padded={false}>
                  <CardHeader
                    title="2. Enter what Canvas gives you"
                    titleAs="h3"
                    description="Saved as “Configured — not verified”. Then run diagnostics."
                  />
                  <p className="px-5 pt-2 text-xs text-muted sm:px-6">
                    The auth, token and JWKS URLs must be https on an allowed host ({allowedHosts});
                    your AceAP host can change the list with{" "}
                    <code className="font-mono">LTI_ALLOWED_HOSTS</code>.
                  </p>
                  <CardBody className="space-y-4">
                    {overview.connections.map((c) => (
                      <ConnectionCard
                        key={c.id}
                        organizationId={org.id}
                        connection={{
                          id: c.id,
                          issuer: c.issuer,
                          clientId: c.clientId,
                          deploymentId: c.deploymentId,
                          authLoginUrl: c.authLoginUrl,
                          authTokenUrl: c.authTokenUrl,
                          jwksUrl: c.jwksUrl,
                          status: c.status,
                          statusNote: c.statusNote,
                          lastVerifiedLabel: c.lastVerifiedAt
                            ? formatDate(c.lastVerifiedAt, { withTime: true })
                            : null,
                          lastError: c.lastError,
                        }}
                        saveAction={saveConnectionAction}
                        defaultsAction={canvasDefaultsAction}
                        diagnosticsAction={runDiagnosticsAction}
                      />
                    ))}
                    <NewConnection
                      key={overview.connections.length}
                      organizationId={org.id}
                      hasConnections={overview.connections.length > 0}
                      saveAction={saveConnectionAction}
                      defaultsAction={canvasDefaultsAction}
                    />
                  </CardBody>
                </Card>
              </div>

              <div className="mt-8">
                <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h3 className="font-display text-base font-semibold text-ink">
                      Grade sync reconciliation
                    </h3>
                    <p className="mt-1 text-sm text-muted">
                      {overview.jobCounts.total === 0
                        ? "No grade-sync jobs yet."
                        : `${overview.jobCounts.pending} pending · ${overview.jobCounts.synced} synced · ${overview.jobCounts.failed} failed · ${overview.jobCounts.blocked} blocked${overview.jobCounts.superseded ? ` · ${overview.jobCounts.superseded} superseded (hidden)` : ""}`}
                    </p>
                  </div>
                </div>
                <TabLinks
                  label={`Filter sync jobs for ${org.name}`}
                  current={statusFilter ?? "all"}
                  className="mb-3"
                  items={[
                    {
                      id: "all",
                      label: "All",
                      href: `/teacher/integrations#org-${org.id}`,
                      count: overview.jobCounts.total - overview.jobCounts.superseded,
                    },
                    ...STATUSES.map((s) => ({
                      id: s,
                      label: s[0].toUpperCase() + s.slice(1),
                      href: `/teacher/integrations?status=${s}#org-${org.id}`,
                      count: overview.jobCounts[s],
                    })),
                  ]}
                />
                <DataTable
                  caption={`Grade sync jobs for ${org.name}`}
                  dense
                  columns={[
                    { key: "student", header: "Student", rowHeader: true },
                    {
                      key: "assignment",
                      header: "Assignment",
                      className: "whitespace-normal min-w-48",
                    },
                    { key: "score", header: "Score", align: "right" },
                    { key: "status", header: "Status" },
                    { key: "attempts", header: "Tries", align: "right" },
                    {
                      key: "error",
                      header: "Last error / recent log",
                      className: "whitespace-normal min-w-64 max-w-md",
                    },
                    { key: "updated", header: "Updated" },
                    {
                      key: "retry",
                      header: <span className="sr-only">Retry</span>,
                      align: "right",
                    },
                  ]}
                  rows={jobs.map((j) => ({
                    id: j.id,
                    student: j.studentName ?? "Unknown student",
                    assignment: j.assignmentTitle ?? "Deleted assignment",
                    score: `${j.scoreGiven}/${j.scoreMaximum}`,
                    status: <Badge tone={JOB_TONE[j.status]}>{j.status}</Badge>,
                    attempts: j.attempts,
                    error: (
                      <div className="text-xs">
                        {j.lastError ? <p className="text-bad">{j.lastError}</p> : null}
                        {j.recentLogs.length ? (
                          <details className="mt-1">
                            <summary className="cursor-pointer text-muted">
                              Recent log ({j.recentLogs.length})
                            </summary>
                            <ul className="mt-1 space-y-0.5">
                              {j.recentLogs.map((l, i) => (
                                <li
                                  key={i}
                                  className={l.level === "error" ? "text-bad" : "text-ink-2"}
                                >
                                  {formatDate(l.createdAt, { withTime: true, short: true })} —{" "}
                                  {l.message}
                                </li>
                              ))}
                            </ul>
                          </details>
                        ) : null}
                        {!j.lastError && !j.recentLogs.length ? (
                          <span className="text-muted">—</span>
                        ) : null}
                      </div>
                    ),
                    updated: formatDate(j.updatedAt, { withTime: true, short: true }),
                    retry:
                      j.status === "failed" || j.status === "blocked" ? (
                        <RetryJobButton
                          organizationId={org.id}
                          jobId={j.id}
                          label={`${j.studentName ?? "student"} — ${j.assignmentTitle ?? "assignment"}`}
                          action={retrySyncJobAction}
                        />
                      ) : null,
                  }))}
                  empty={
                    <EmptyState
                      bare
                      className="rounded-card border border-line"
                      title={statusFilter ? `No ${statusFilter} jobs` : "Nothing to reconcile"}
                      description={
                        overview.connections.length === 0
                          ? "Grade sync starts only after a Canvas connection is configured, verified and assignments are linked."
                          : "When grades are queued for Canvas they appear here with their delivery status."
                      }
                    />
                  }
                />
              </div>
            </Section>
          );
        })
      )}

      <Section
        id="setup"
        title="Setup steps for your Canvas admin"
        description="Summary of the full guide in docs/CANVAS_INTEGRATION.md (“Required Canvas administrator setup”)."
        className="mt-12"
      >
        <Card>
          <ol className="list-decimal space-y-3 pl-5 text-sm text-ink-2">
            <li>
              <span className="font-medium text-ink">Create an LTI Developer Key</span> (Admin →
              Developer Keys → + Developer Key → LTI Key). Use the three URLs above for the Redirect
              URI / Target Link URI, the OpenID Connect Initiation URL and the Public JWK URL.
            </li>
            <li>
              <span className="font-medium text-ink">Grant the LTI Advantage scopes</span>: AGS line
              items and scores, and NRPS membership (read-only). Placements: Course Navigation
              (resource link) and Assignment / Link Selection (deep linking). Privacy level: the
              lowest that works (anonymous is enough for grade passback).
            </li>
            <li>
              <span className="font-medium text-ink">Turn the key ON</span> and copy its{" "}
              <strong>Client ID</strong>.
            </li>
            <li>
              <span className="font-medium text-ink">Install the app by Client ID</span> (Settings →
              Apps → View App Configurations → + App → By Client ID), then copy the{" "}
              <strong>Deployment ID</strong> from the app&apos;s gear menu.
            </li>
            <li>
              <span className="font-medium text-ink">Enter the connection here</span>: issuer,
              client id, deployment id and Canvas&apos;s auth, token and JWKS URLs (“Fill Canvas
              cloud defaults” pre-fills Instructure-hosted values; self-hosted, beta and test
              instances differ).
            </li>
            <li>
              <span className="font-medium text-ink">Run diagnostics.</span> Only when every check
              passes is the connection shown as verified — and that still doesn&apos;t prove a
              launch has worked. Try a real launch from a Canvas sandbox course before relying on
              it.
            </li>
          </ol>
          <p className="mt-4 text-xs text-muted">
            Embedding note: only AceAP&apos;s LTI pages (launch, account linking and the assignment
            picker) may be shown inside Canvas, and only by the hosts in{" "}
            <code className="font-mono">LTI_ALLOWED_HOSTS</code>. Everything else opens in a new tab: set{" "}
            <code className="font-mono">&quot;windowTarget&quot;: &quot;_blank&quot;</code> on the Course
            Navigation placement; links added with the AceAP assignment picker ask Canvas to open in a new
            window. See the guide for the remaining known gaps, and{" "}
            <Link href="#main" className="text-accent underline underline-offset-2">
              return to the connection settings
            </Link>
            .
          </p>
        </Card>
      </Section>
    </>
  );
}
