/**
 * Runs on every page request (not API routes or static assets):
 *
 * 1. Optimistic redirect only: signed-out requests to the signed-in areas go
 *    to /login. Real authorisation happens in layouts, pages, actions, route
 *    handlers and PostgreSQL row-level security (see docs/SECURITY.md).
 * 2. Content-Security-Policy with a fresh per-request nonce (src/lib/csp.ts).
 *    The policy is forwarded on the request so Next.js applies the nonce to
 *    its own scripts, and `x-nonce` lets the root layout nonce its inline
 *    theme script.
 */
import { NextResponse, type NextRequest } from "next/server";
import { buildCsp, createNonce } from "@/lib/csp";

const SESSION_COOKIE = "aceap_session";
const PROTECTED = /^\/(app|teacher|admin)(\/|$)/;

function isHttps(request: NextRequest): boolean {
  const forwarded = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  return (forwarded ?? request.nextUrl.protocol.replace(/:$/, "")) === "https";
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (PROTECTED.test(pathname) && !request.cookies.get(SESSION_COOKIE)?.value) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(`${pathname}${search}`)}`;
    return NextResponse.redirect(url);
  }

  const dev = process.env.NODE_ENV === "development";
  const https = !dev && process.env.ACEAP_INSECURE_COOKIES !== "1" && isHttps(request);
  const nonce = createNonce();
  const csp = buildCsp({ nonce, pathname, dev, upgradeInsecure: https });

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  if (https) response.headers.set("Strict-Transport-Security", "max-age=63072000");
  return response;
}

export const config = {
  matcher: [
    /*
     * Every page route. Excluded: API routes (JSON; they get a locked-down CSP
     * from next.config.ts), Next's static/image assets, and public files
     * (icons, manifest, service worker, app icon). Prefetches are NOT excluded
     * so the signed-out redirect above keeps applying to them.
     */
    "/((?!api/|_next/static|_next/image|favicon\\.ico|icon\\.svg|icons/|manifest\\.webmanifest|sw\\.js|robots\\.txt|sitemap\\.xml).*)",
  ],
};
