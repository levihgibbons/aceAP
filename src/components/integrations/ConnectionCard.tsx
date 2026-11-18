"use client";
/** One saved connection: its settings, status, diagnostics and an edit form. */
import { useState, useTransition } from "react";
import { CheckCircle2, Stethoscope, XCircle } from "lucide-react";
import { Badge, Button, KeyValue } from "@/components/ui";
import { CONNECTION_STATUS } from "./status";
import type { ActionState } from "@/components/assignments/action-state";
import { ConnectionForm, type ConnectionFormValues } from "./ConnectionForm";

export interface ConnectionCardData extends Required<ConnectionFormValues> {
  status: "not_configured" | "configured_unverified" | "verified" | "error";
  statusNote: string | null;
  lastVerifiedLabel: string | null;
  lastError: string | null;
}

interface Check {
  check: string;
  ok: boolean;
  detail: string;
}

const CHECK_LABEL: Record<string, string> = {
  tool_key: "AceAP tool signing key",
  platform_jwks: "Canvas public key set (JWKS)",
  token_grant: "Token endpoint grants the grade (AGS score) scope",
};

export function ConnectionCard({
  organizationId,
  connection,
  saveAction,
  defaultsAction,
  diagnosticsAction,
}: {
  organizationId: string;
  connection: ConnectionCardData;
  saveAction: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  defaultsAction: Parameters<typeof ConnectionForm>[0]["defaultsAction"];
  diagnosticsAction: (
    organizationId: string,
    connectionId: string,
  ) => Promise<ActionState & { report?: { checks: Check[]; status: string } }>;
}) {
  const [editing, setEditing] = useState(false);
  const [checks, setChecks] = useState<Check[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, start] = useTransition();
  const st = CONNECTION_STATUS[connection.status];

  const diagnose = () =>
    start(async () => {
      setError(null);
      const res = await diagnosticsAction(organizationId, connection.id);
      if (res.ok && res.report) setChecks(res.report.checks);
      else setError(res.error ?? "Diagnostics could not run.");
    });

  return (
    <div className="rounded-lg border border-line p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-mono text-[0.8125rem] text-ink">{connection.issuer}</p>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
            <Badge tone={st.tone}>{st.label}</Badge>
            {connection.lastVerifiedLabel ? (
              <span>Last passed {connection.lastVerifiedLabel}</span>
            ) : (
              <span>Never verified</span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={diagnose}
            loading={running}
            loadingText="Running…"
            icon={<Stethoscope aria-hidden="true" className="size-3.5" />}
          >
            Run diagnostics
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setEditing((e) => !e)}
            aria-expanded={editing}
          >
            {editing ? "Close editor" : "Edit"}
          </Button>
        </div>
      </div>
      {connection.statusNote ? (
        <p className="mt-3 text-sm text-warn">{connection.statusNote}</p>
      ) : null}
      {connection.lastError && !checks ? (
        <p className="mt-3 rounded-lg bg-bad-soft px-3 py-2 text-xs text-bad">
          <span className="font-semibold">Last diagnostics: </span>
          {connection.lastError}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="mt-3 text-sm font-medium text-bad">
          {error}
        </p>
      ) : null}
      {checks ? (
        <div className="mt-4" aria-live="polite">
          <p className="text-xs font-semibold text-muted">Diagnostics just now</p>
          <ul className="mt-2 space-y-2">
            {checks.map((c) => (
              <li key={c.check} className="flex items-start gap-2 text-sm">
                {c.ok ? (
                  <CheckCircle2 aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-good" />
                ) : (
                  <XCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-bad" />
                )}
                <span className="min-w-0">
                  <span className="font-medium text-ink">
                    {CHECK_LABEL[c.check] ?? c.check}: {c.ok ? "passed" : "failed"}
                  </span>
                  <span className="block break-words text-xs text-muted">{c.detail}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted">
            {checks.every((c) => c.ok)
              ? "All checks passed. This proves the endpoints and keys respond; it does not mean a launch from Canvas has succeeded."
              : "Failures are expected until your Canvas admin has created the Developer Key and the AceAP tool key is configured on the server."}
          </p>
        </div>
      ) : null}
      <div className="mt-4">
        <KeyValue
          items={[
            {
              label: "Client ID",
              value: <span className="font-mono text-[0.8125rem]">{connection.clientId}</span>,
            },
            {
              label: "Deployment ID",
              value: <span className="font-mono text-[0.8125rem]">{connection.deploymentId}</span>,
            },
            {
              label: "Auth login URL",
              value: (
                <span className="break-all font-mono text-[0.75rem]">
                  {connection.authLoginUrl}
                </span>
              ),
            },
            {
              label: "Token URL",
              value: (
                <span className="break-all font-mono text-[0.75rem]">
                  {connection.authTokenUrl}
                </span>
              ),
            },
            {
              label: "JWKS URL",
              value: (
                <span className="break-all font-mono text-[0.75rem]">{connection.jwksUrl}</span>
              ),
            },
          ]}
        />
      </div>
      {editing ? (
        <div className="mt-4 border-t border-line pt-4">
          <p className="mb-3 text-xs text-muted">
            Changing any value resets the status to “Configured — not verified”.
          </p>
          <ConnectionForm
            organizationId={organizationId}
            initial={connection}
            saveAction={saveAction}
            defaultsAction={defaultsAction}
            onDone={() => setEditing(false)}
          />
        </div>
      ) : null}
    </div>
  );
}
