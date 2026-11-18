/** Connection status labels (server-safe). Never claims more than diagnostics proved. */
import type { BadgeTone } from "@/components/ui";

export type ConnectionStatus = "not_configured" | "configured_unverified" | "verified" | "error";

export const CONNECTION_STATUS: Record<ConnectionStatus, { label: string; tone: BadgeTone }> = {
  not_configured: { label: "Not configured", tone: "neutral" },
  configured_unverified: { label: "Configured — not verified", tone: "warn" },
  verified: { label: "Diagnostics passed", tone: "good" },
  error: { label: "Diagnostics failed", tone: "bad" },
};
