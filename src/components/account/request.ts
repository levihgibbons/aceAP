/** Request helpers for account server actions (server-only; not actions themselves). */
import "server-only";
import { headers } from "next/headers";

/** Best-effort client identifier for rate limiting (same rule as sign-in). */
export async function clientKey(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || h.get("x-real-ip") || "local";
}

export function formString(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v : "";
}
