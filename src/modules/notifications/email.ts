/**
 * Email delivery adapter.
 *
 *   const sender = getEmailSender();
 *   if (!sender.configured) → tell the user email isn't set up (never pretend)
 *   await sender.send({ to, subject, text });
 *
 * Adapters (chosen from the environment on every call, so tests and scripts
 * can switch them):
 *  - "outbox" — development only. Writes the message to the `email_outbox`
 *    table and prints a one-line notice; developers read it at /dev/outbox.
 *    Used when EMAIL_PROVIDER is unset or "outbox" and NODE_ENV is not
 *    "production". ACEAP_DEV_OUTBOX=1 also enables it in a production build —
 *    ONLY for automated end-to-end tests; never set it on a real deployment.
 *  - "none"   — anything else (production without a provider, EMAIL_PROVIDER=none,
 *    or an unknown provider). `configured` is false and `send` throws
 *    EmailNotConfiguredError.
 *
 * A real provider (e.g. an HTTP email API) plugs in by adding a case to
 * getEmailSender(); callers don't change.
 */
import { desc } from "drizzle-orm";
import { getDb } from "@/db/client";
import * as t from "@/db/schema";

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export type EmailSenderKind = "outbox" | "none";

export interface EmailSender {
  readonly kind: EmailSenderKind;
  /** False when messages can't be delivered; callers must say so honestly. */
  readonly configured: boolean;
  send(message: EmailMessage): Promise<void>;
}

export class EmailNotConfiguredError extends Error {
  constructor(reason: string) {
    super(`Email delivery is not configured: ${reason}`);
    this.name = "EmailNotConfiguredError";
  }
}

const DEFAULT_FROM = "AceAP <no-reply@aceap.invalid>";

export const emailFrom = () => process.env.EMAIL_FROM?.trim() || DEFAULT_FROM;

/** True when the development outbox (adapter and /dev/outbox page) may be used. */
export function devOutboxEnabled(): boolean {
  return process.env.ACEAP_DEV_OUTBOX === "1" || process.env.NODE_ENV !== "production";
}

/** Mask the local part so console notices don't print full addresses. */
function maskAddress(address: string): string {
  const [local, domain] = address.split("@");
  if (!domain) return "***";
  return `${local.slice(0, 1)}***@${domain}`;
}

const outboxSender: EmailSender = {
  kind: "outbox",
  configured: true,
  async send(message) {
    const db = await getDb();
    await db.insert(t.emailOutbox).values({
      fromAddress: emailFrom(),
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html ?? null,
    });
    console.info(`[email:outbox] "${message.subject}" → ${maskAddress(message.to)} (not delivered; read it at /dev/outbox)`);
  },
};

function noneSender(reason: string): EmailSender {
  return {
    kind: "none",
    configured: false,
    async send() {
      throw new EmailNotConfiguredError(reason);
    },
  };
}

export function getEmailSender(): EmailSender {
  const provider = (process.env.EMAIL_PROVIDER ?? "").trim().toLowerCase() || "outbox";
  if (provider === "outbox") {
    return devOutboxEnabled() ? outboxSender : noneSender("no email provider is configured for production (EMAIL_PROVIDER)");
  }
  if (provider === "none") return noneSender("EMAIL_PROVIDER is set to none");
  return noneSender(`unknown EMAIL_PROVIDER "${provider}"`);
}

/** Recent outbox messages, newest first (development page and tests). */
export async function listOutbox(limit = 50) {
  const db = await getDb();
  return db.select().from(t.emailOutbox).orderBy(desc(t.emailOutbox.createdAt), desc(t.emailOutbox.id)).limit(limit);
}
