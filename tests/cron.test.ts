/**
 * Scheduled-job routes (/api/cron/*): closed without CRON_SECRET, refuse a
 * wrong or missing bearer token, and run the job with the right one.
 */
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { getDb } from "@/db/client";
import { isAuthorisedCronRequest } from "@/lib/cron";
import { GET as retention } from "@/app/api/cron/retention/route";
import { GET as lmsSync } from "@/app/api/cron/lms-sync/route";

const SECRET = "test-cron-secret-0123456789";
const req = (auth?: string) => new NextRequest("http://localhost/api/cron/retention", { headers: auth ? { authorization: auth } : {} });

beforeAll(async () => {
  await getDb();
});

afterEach(() => vi.unstubAllEnvs());

describe("cron authorisation", () => {
  it("is closed when CRON_SECRET is missing or too short", async () => {
    vi.stubEnv("CRON_SECRET", "");
    expect((await retention(req(`Bearer `))).status).toBe(503);
    vi.stubEnv("CRON_SECRET", "short");
    expect(isAuthorisedCronRequest(req("Bearer short"))).toBe(false);
    expect((await retention(req("Bearer short"))).status).toBe(503);
  });

  it("refuses a missing or wrong token", async () => {
    vi.stubEnv("CRON_SECRET", SECRET);
    expect((await retention(req())).status).toBe(401);
    expect((await retention(req(`Bearer ${SECRET}x`))).status).toBe(401);
    expect((await retention(req(SECRET))).status).toBe(401);
  });

  it("runs retention and the LMS sync with the right token, returning counts only", async () => {
    vi.stubEnv("CRON_SECRET", SECRET);
    const r = await retention(req(`Bearer ${SECRET}`));
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body).toMatchObject({ ok: true, mode: "apply" });
    expect(Object.values(body.counts).every((n) => typeof n === "number")).toBe(true);

    const s = await lmsSync(req(`Bearer ${SECRET}`));
    expect(s.status).toBe(200);
    expect(await s.json()).toEqual({ ok: true, connections: [], failed: 0 });
  });
});
