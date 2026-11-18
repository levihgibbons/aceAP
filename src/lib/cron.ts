/**
 * Authorisation for scheduled-job routes (/api/cron/*).
 *
 * Vercel Cron calls each path in vercel.json with
 * `Authorization: Bearer $CRON_SECRET` when CRON_SECRET is set on the project;
 * any other scheduler can send the same header. Without CRON_SECRET the routes
 * refuse every request (never open by default).
 */
import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

/** Minimum secret length accepted (Vercel recommends ≥ 16 random characters). */
const MIN_SECRET_LENGTH = 16;

export function cronSecretConfigured(): boolean {
  return (process.env.CRON_SECRET?.trim().length ?? 0) >= MIN_SECRET_LENGTH;
}

export function isAuthorisedCronRequest(req: Pick<NextRequest, "headers">): boolean {
  const secret = process.env.CRON_SECRET?.trim() ?? "";
  if (secret.length < MIN_SECRET_LENGTH) return false;
  const header = req.headers.get("authorization") ?? "";
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(header);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/** Wrap a job: refuse unauthorised calls, run the job, report JSON (500 on failure so the scheduler shows it). */
export function cronHandler(job: () => Promise<{ ok: boolean; [k: string]: unknown }>) {
  return async (req: NextRequest): Promise<Response> => {
    const headers = { "Cache-Control": "no-store" };
    if (!cronSecretConfigured())
      return NextResponse.json({ error: { code: "not_configured", message: "CRON_SECRET is not set on this deployment; scheduled jobs are disabled." } }, { status: 503, headers });
    if (!isAuthorisedCronRequest(req)) return NextResponse.json({ error: { code: "unauthenticated", message: "Missing or wrong cron secret." } }, { status: 401, headers });
    try {
      const result = await job();
      return NextResponse.json(result, { status: result.ok ? 200 : 500, headers });
    } catch (e) {
      console.error("[cron]", req.nextUrl.pathname, e);
      return NextResponse.json({ ok: false, error: { code: "server_error", message: "The job failed; see the function logs." } }, { status: 500, headers });
    }
  };
}
