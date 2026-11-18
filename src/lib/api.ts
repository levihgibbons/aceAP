/**
 * Route-handler helpers. Every /api handler:
 *   export const POST = apiHandler(async (req) => { const user = await requireApiUser(); ... return { ok: true }; });
 * - returns JSON; DomainError → its HTTP status + { error: { code, message } }
 * - ZodError → 422 with field issues
 * - anything else → 500 with a generic message (details logged server-side)
 * - mutations (non-GET) must come from this origin (CSRF defence in depth on
 *   top of SameSite=Lax cookies).
 */
import { NextResponse, type NextRequest } from "next/server";
import { ZodError, type ZodType } from "zod";
import { DomainError, HTTP_STATUS } from "@/lib/errors";

type Handler<C> = (req: NextRequest, ctx: C) => Promise<unknown>;

function sameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return req.headers.get("sec-fetch-site") !== "cross-site";
  try {
    return new URL(origin).host === req.headers.get("host");
  } catch {
    return false;
  }
}

export function apiHandler<C = unknown>(fn: Handler<C>) {
  return async (req: NextRequest, ctx: C): Promise<Response> => {
    try {
      if (req.method !== "GET" && req.method !== "HEAD" && !sameOrigin(req))
        return NextResponse.json({ error: { code: "forbidden", message: "Cross-site request refused." } }, { status: 403 });
      const out = await fn(req, ctx);
      if (out instanceof Response) return out;
      return NextResponse.json(out ?? { ok: true }, { headers: { "Cache-Control": "no-store" } });
    } catch (e) {
      if (e instanceof DomainError) return NextResponse.json({ error: { code: e.code, message: e.message } }, { status: HTTP_STATUS[e.code] });
      if (e instanceof ZodError)
        return NextResponse.json(
          { error: { code: "invalid", message: e.issues[0]?.message ?? "Invalid request.", issues: e.issues.map((i) => ({ path: i.path.join("."), message: i.message })) } },
          { status: 422 },
        );
      console.error("[api]", req.method, req.nextUrl.pathname, e);
      return NextResponse.json({ error: { code: "server_error", message: "Something went wrong. Please try again." } }, { status: 500 });
    }
  };
}

/** Parse a JSON body with a Zod schema (throws ZodError → 422). */
export async function parseJson<T>(req: NextRequest, schema: ZodType<T>): Promise<T> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new DomainError("invalid", "Request body must be JSON.");
  }
  return schema.parse(body);
}

/** Client-side fetch helper for these handlers: throws Error(message) on failure. */
export async function apiFetch<T>(url: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const res = await fetch(url, {
    ...init,
    method: init?.method ?? (init?.json !== undefined ? "POST" : "GET"),
    headers: { ...(init?.json !== undefined ? { "Content-Type": "application/json" } : {}), ...init?.headers },
    body: init?.json !== undefined ? JSON.stringify(init.json) : init?.body,
  });
  const data = (await res.json().catch(() => ({}))) as { error?: { message?: string } } & T;
  if (!res.ok) throw new Error(data.error?.message ?? `Request failed (${res.status}).`);
  return data;
}
