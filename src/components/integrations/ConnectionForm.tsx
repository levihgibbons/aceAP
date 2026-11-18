"use client";
/**
 * Create or edit a Canvas LTI 1.3 connection. Saving never contacts Canvas and
 * stores the connection as "Configured — not verified".
 */
import { useState, useTransition, type FormEvent } from "react";
import { Wand2 } from "lucide-react";
import { Button, Field, Input, useToast } from "@/components/ui";
import type { ActionState } from "@/components/assignments/action-state";

export interface ConnectionFormValues {
  id?: string;
  issuer: string;
  clientId: string;
  deploymentId: string;
  authLoginUrl: string;
  authTokenUrl: string;
  jwksUrl: string;
}

const EMPTY: ConnectionFormValues = {
  issuer: "",
  clientId: "",
  deploymentId: "",
  authLoginUrl: "",
  authTokenUrl: "",
  jwksUrl: "",
};

type Defaults = {
  issuer: string;
  authLoginUrl: string;
  authTokenUrl: string;
  jwksUrl: string;
  instructureHosted: boolean;
} | null;

export function ConnectionForm({
  organizationId,
  initial,
  saveAction,
  defaultsAction,
  onDone,
}: {
  organizationId: string;
  initial?: ConnectionFormValues;
  saveAction: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  defaultsAction: (issuer: string) => Promise<Defaults>;
  onDone?: () => void;
}) {
  const { toast } = useToast();
  const [values, setValues] = useState<ConnectionFormValues>(initial ?? EMPTY);
  const [result, setResult] = useState<ActionState>({});
  const [note, setNote] = useState<string | null>(null);
  const [saving, startSave] = useTransition();
  const [filling, startFill] = useTransition();
  const fe = result.fieldErrors ?? {};
  const prefix = `cf-${organizationId.slice(0, 8)}-${initial?.id?.slice(0, 8) ?? "new"}`;

  const fill = () =>
    startFill(async () => {
      const d = await defaultsAction(values.issuer);
      if (!d) {
        setNote("The issuer isn't a valid URL, so no defaults could be suggested.");
        return;
      }
      setValues((v) => ({
        ...v,
        issuer: d.issuer,
        authLoginUrl: d.authLoginUrl,
        authTokenUrl: d.authTokenUrl,
        jwksUrl: d.jwksUrl,
      }));
      setNote(
        d.instructureHosted
          ? "Filled Instructure-hosted Canvas defaults. Check the token URL with your Canvas admin — hosted schools often use their own domain (https://<school>.instructure.com/login/oauth2/token)."
          : "Filled self-hosted defaults derived from the issuer. Confirm every URL with your Canvas admin.",
      );
    });

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startSave(async () => {
      const res = await saveAction({}, fd);
      setResult(res);
      if (res.ok) {
        toast({
          title: "Connection saved",
          description: res.message,
          tone: "good",
          duration: 8000,
        });
        onDone?.();
      }
    });
  };

  const field = (
    name: keyof Omit<ConnectionFormValues, "id">,
    label: string,
    hint: string,
    opts: { mono?: boolean; placeholder?: string } = {},
  ) => (
    <Field label={label} htmlFor={`${prefix}-${name}`} error={fe[name]} hint={hint} required>
      <Input
        id={`${prefix}-${name}`}
        name={name}
        value={values[name]}
        placeholder={opts.placeholder}
        autoComplete="off"
        spellCheck={false}
        className={opts.mono ? "font-mono text-[0.8125rem]" : undefined}
        onChange={(e) => setValues({ ...values, [name]: e.target.value })}
      />
    </Field>
  );

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <input type="hidden" name="organizationId" value={organizationId} />
      {initial?.id ? <input type="hidden" name="id" value={initial.id} /> : null}
      {result.error ? (
        <p role="alert" className="rounded-lg bg-bad-soft px-3 py-2 text-sm font-medium text-bad">
          {result.error}
        </p>
      ) : null}
      {field(
        "issuer",
        "Issuer",
        "Instructure-hosted: https://canvas.instructure.com (beta/test differ). Self-hosted: your Canvas iss.",
        { mono: true, placeholder: "https://canvas.instructure.com" },
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="secondary"
          size="sm"
          onClick={fill}
          loading={filling}
          loadingText="Filling…"
          icon={<Wand2 aria-hidden="true" className="size-3.5" />}
        >
          Fill Canvas cloud defaults
        </Button>
        <span className="text-xs text-muted">
          Uses the issuer above, or Instructure production if empty. No network request is made.
        </span>
      </div>
      {note ? (
        <p className="rounded-lg bg-info-soft px-3 py-2 text-xs text-info" aria-live="polite">
          {note}
        </p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        {field(
          "clientId",
          "Client ID",
          "The Developer Key's client id (Admin → Developer Keys → Details).",
          { mono: true },
        )}
        {field(
          "deploymentId",
          "Deployment ID",
          "From the installed app's gear menu → Deployment Id.",
          { mono: true },
        )}
      </div>
      {field(
        "authLoginUrl",
        "Auth login URL",
        "OIDC authorization endpoint, e.g. https://sso.canvaslms.com/api/lti/authorize_redirect",
        { mono: true },
      )}
      {field(
        "authTokenUrl",
        "Token URL",
        "OAuth2 token endpoint, e.g. https://<school>.instructure.com/login/oauth2/token",
        { mono: true },
      )}
      {field(
        "jwksUrl",
        "Platform JWKS URL",
        "Canvas's public key set, e.g. https://sso.canvaslms.com/api/lti/security/jwks",
        { mono: true },
      )}
      <div className="flex flex-wrap gap-2 pt-1">
        <Button type="submit" loading={saving} loadingText="Saving…">
          {initial?.id ? "Save changes" : "Save connection"}
        </Button>
        {onDone ? (
          <Button variant="ghost" onClick={onDone} disabled={saving}>
            Cancel
          </Button>
        ) : null}
      </div>
      <p className="text-xs text-muted">
        Saving stores these settings only. No credentials or secrets are entered here — LTI 1.3 uses
        public keys.
      </p>
    </form>
  );
}
