import type { Metadata } from "next";
import { asc } from "drizzle-orm";
import { KeyRound } from "lucide-react";
import { getDb } from "@/db/client";
import * as t from "@/db/schema";
import {
  Badge,
  DataTable,
  EmptyState,
  PageHeader,
  formatDate,
  type BadgeTone,
} from "@/components/ui";
import { requireRole } from "@/modules/auth/session";

export const metadata: Metadata = { title: "Licensing" };

const COMMERCIAL: Record<string, { label: string; tone: BadgeTone }> = {
  allowed: { label: "Allowed", tone: "good" },
  not_allowed: { label: "Not allowed", tone: "bad" },
  requires_agreement: { label: "Requires agreement", tone: "warn" },
  unverified: { label: "Unverified", tone: "warn" },
};
const MODIFICATION: Record<string, { label: string; tone: BadgeTone }> = {
  allowed: { label: "Allowed", tone: "good" },
  not_allowed: { label: "Not allowed", tone: "bad" },
  unverified: { label: "Unverified", tone: "warn" },
};
const USAGE: Record<string, string> = {
  alignment_reference: "Alignment reference only",
  linked: "Linked",
  embedded: "Embedded",
  adapted: "Adapted",
  not_used: "Not used",
};
const APPROVAL: Record<string, { label: string; tone: BadgeTone }> = {
  approved: { label: "Approved", tone: "good" },
  pending_review: { label: "Pending review", tone: "warn" },
  rejected: { label: "Rejected", tone: "bad" },
};

export default async function LicensingPage() {
  await requireRole("platform_admin");
  const db = await getDb();
  const sources = await db.select().from(t.contentSources).orderBy(asc(t.contentSources.title));
  const pending = sources.filter((s) => s.approvalStatus !== "approved").length;

  return (
    <>
      <PageHeader
        title="Licensing registry"
        description="Every third-party resource must be registered here — with its licence and permitted use — before it is referenced, linked, embedded or adapted. Entries come from content/sources.ts and are synced with the content pipeline."
      />
      {pending ? (
        <p className="mb-6 rounded-lg bg-warn-soft px-4 py-3 text-sm text-warn">
          {pending} source{pending === 1 ? " is" : "s are"} not approved. Unapproved sources must
          not be used in student-facing content.
        </p>
      ) : null}
      <DataTable
        caption="Content sources"
        columns={[
          {
            key: "source",
            header: "Source",
            rowHeader: true,
            className: "min-w-56 whitespace-normal",
          },
          { key: "license", header: "Licence", className: "whitespace-normal min-w-40" },
          { key: "commercial", header: "Commercial use" },
          { key: "modification", header: "Modification" },
          { key: "usage", header: "How AceAP uses it" },
          { key: "approval", header: "Approval" },
          { key: "notes", header: "Notes", className: "whitespace-normal min-w-72" },
        ]}
        rows={sources.map((s) => ({
          id: s.id,
          source: (
            <div>
              {/^https?:\/\//i.test(s.url) ? (
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-ink underline-offset-4 hover:text-accent hover:underline"
                >
                  {s.title}
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              ) : (
                <span className="font-medium text-ink">{s.title}</span>
              )}
              <span className="mt-0.5 block text-xs text-muted">{s.provider}</span>
            </div>
          ),
          license: (
            <div className="text-sm">
              {s.license}
              {s.attribution ? (
                <span className="mt-0.5 block text-xs text-muted">
                  Attribution: {s.attribution}
                </span>
              ) : null}
            </div>
          ),
          commercial: (
            <Badge tone={COMMERCIAL[s.commercialUse]?.tone ?? "neutral"}>
              {COMMERCIAL[s.commercialUse]?.label ?? s.commercialUse}
            </Badge>
          ),
          modification: (
            <Badge tone={MODIFICATION[s.modification]?.tone ?? "neutral"}>
              {MODIFICATION[s.modification]?.label ?? s.modification}
            </Badge>
          ),
          usage: USAGE[s.usage] ?? s.usage,
          approval: (
            <div>
              <Badge tone={APPROVAL[s.approvalStatus]?.tone ?? "neutral"}>
                {APPROVAL[s.approvalStatus]?.label ?? s.approvalStatus}
              </Badge>
              {s.reviewedOn ? (
                <span className="mt-1 block text-xs text-muted">
                  Reviewed {formatDate(s.reviewedOn)}
                </span>
              ) : null}
            </div>
          ),
          notes: <span className="text-sm">{s.notes || "—"}</span>,
        }))}
        empty={
          <EmptyState
            icon={<KeyRound />}
            title="No sources registered"
            description="Run the content sync to load content/sources.ts into the registry."
          />
        }
      />
    </>
  );
}
