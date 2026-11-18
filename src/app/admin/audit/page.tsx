import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import { ScrollText } from "lucide-react";
import { getDb } from "@/db/client";
import * as t from "@/db/schema";
import {
  Button,
  DataTable,
  EmptyState,
  Input,
  PageHeader,
  Pill,
  formatDate,
} from "@/components/ui";
import { requireRole } from "@/modules/auth/session";

export const metadata: Metadata = { title: "Audit log" };

const PAGE_SIZE = 50;

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireRole("platform_admin");
  const params = await searchParams;
  const prefix = typeof params.action === "string" ? params.action.trim().slice(0, 80) : "";
  const page = Math.max(
    1,
    Math.floor(Number(typeof params.page === "string" ? params.page : 1)) || 1,
  );
  const db = await getDb();

  // LIKE prefix with %, _ and \ escaped so the filter is literal.
  const where = prefix
    ? sql`${t.auditLogs.action} like ${prefix.replace(/[\\%_]/g, (c) => `\\${c}`) + "%"}`
    : undefined;
  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(t.auditLogs)
    .where(where);
  const rows = await db
    .select({
      log: t.auditLogs,
      actorName: t.users.name,
      actorRole: t.users.role,
      orgName: t.organizations.name,
    })
    .from(t.auditLogs)
    .leftJoin(t.users, eq(t.users.id, t.auditLogs.actorId))
    .leftJoin(t.organizations, eq(t.organizations.id, t.auditLogs.organizationId))
    .where(where)
    .orderBy(desc(t.auditLogs.createdAt), desc(t.auditLogs.id))
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE);
  const prefixes = await db
    .select({
      p: sql<string>`split_part(${t.auditLogs.action}, '.', 1)`,
      n: sql<number>`count(*)::int`,
    })
    .from(t.auditLogs)
    .groupBy(sql`1`)
    .orderBy(sql`1`);

  const pages = Math.max(1, Math.ceil(Number(total) / PAGE_SIZE));
  const href = (p: number, a = prefix) => {
    const s = new URLSearchParams();
    if (a) s.set("action", a);
    if (p > 1) s.set("page", String(p));
    const q = s.toString();
    return q ? `/admin/audit?${q}` : "/admin/audit";
  };

  return (
    <>
      <PageHeader
        title="Audit log"
        description="Append-only record of sensitive changes: grades, policies, assignments, connections and content. Newest first."
      />

      <form
        key={prefix}
        method="get"
        action="/admin/audit"
        className="mb-3 flex flex-wrap items-end gap-3"
      >
        <div>
          <label htmlFor="f-action" className="mb-1.5 block text-sm font-medium text-ink">
            Action starts with
          </label>
          <Input
            id="f-action"
            name="action"
            defaultValue={prefix}
            placeholder="e.g. gradebook. or assignment.created"
            className="w-72"
          />
        </div>
        <Button type="submit" variant="secondary">
          Filter
        </Button>
        {prefix ? (
          <Link href="/admin/audit" className="pb-2.5 text-sm text-accent hover:underline">
            Clear
          </Link>
        ) : null}
      </form>
      {prefixes.length ? (
        <ul className="mb-6 flex flex-wrap gap-2" aria-label="Quick filters">
          {prefixes.map((p) => (
            <li key={p.p}>
              <Link
                href={href(1, `${p.p}.`)}
                aria-current={prefix === `${p.p}.` ? "true" : undefined}
                className="rounded-full focus-visible:outline-2 focus-visible:outline-accent"
              >
                <Pill className={prefix === `${p.p}.` ? "border-accent text-accent" : undefined}>
                  {p.p} · {p.n}
                </Pill>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      <p className="mb-3 text-sm text-muted" aria-live="polite">
        {total} entr{Number(total) === 1 ? "y" : "ies"}
        {pages > 1 ? ` · page ${page} of ${pages}` : ""}
      </p>

      <DataTable
        caption="Audit log entries"
        dense
        columns={[
          { key: "time", header: "Time" },
          { key: "actor", header: "Actor", rowHeader: true },
          { key: "action", header: "Action" },
          { key: "entity", header: "Entity", className: "whitespace-normal min-w-48" },
          { key: "org", header: "Organisation" },
          { key: "meta", header: "Details", className: "whitespace-normal min-w-64 max-w-md" },
        ]}
        rows={rows.map(({ log, actorName, actorRole, orgName }) => ({
          id: log.id,
          time: (
            <time dateTime={log.createdAt.toISOString()}>
              {formatDate(log.createdAt, { withTime: true })}
            </time>
          ),
          actor: log.actorId ? (
            <span>
              {actorName ?? "Deleted user"}
              {actorRole ? (
                <span className="block text-xs font-normal text-muted">
                  {actorRole.replace("_", " ")}
                </span>
              ) : null}
            </span>
          ) : (
            <span className="text-muted">System</span>
          ),
          action: <code className="font-mono text-xs text-ink">{log.action}</code>,
          entity: (
            <span className="text-xs">
              {log.entityType}
              {log.entityId ? (
                <span className="block break-all font-mono text-[0.6875rem] text-muted">
                  {log.entityId}
                </span>
              ) : null}
            </span>
          ),
          org: orgName ?? <span className="text-muted">—</span>,
          meta:
            Object.keys(log.metadata ?? {}).length > 0 ? (
              <details className="text-xs">
                <summary className="cursor-pointer text-accent">Metadata</summary>
                <pre className="mt-1 max-h-64 overflow-auto whitespace-pre-wrap break-all rounded-md bg-surface-2 p-2 font-mono text-[0.6875rem] text-ink-2">
                  {JSON.stringify(log.metadata, null, 2)}
                </pre>
              </details>
            ) : (
              <span className="text-xs text-muted">—</span>
            ),
        }))}
        empty={
          <EmptyState
            icon={<ScrollText />}
            title="No entries"
            description={
              prefix
                ? `Nothing logged with an action starting “${prefix}”.`
                : "Nothing has been logged yet."
            }
          />
        }
      />

      {pages > 1 ? (
        <nav
          aria-label="Audit log pages"
          className="mt-4 flex items-center justify-between text-sm"
        >
          {page > 1 ? (
            <Link href={href(page - 1)} className="font-medium text-accent hover:underline">
              ← Newer
            </Link>
          ) : (
            <span />
          )}
          {page < pages ? (
            <Link href={href(page + 1)} className="font-medium text-accent hover:underline">
              Older →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </>
  );
}
