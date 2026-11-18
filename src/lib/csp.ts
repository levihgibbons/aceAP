/**
 * Content-Security-Policy for HTML page responses (applied in src/proxy.ts).
 *
 * Scripts: strict, nonce-based ('strict-dynamic'). The proxy generates a fresh
 * nonce per request and forwards the policy on the request so Next.js stamps
 * the nonce on its own framework/page scripts; the root layout reads it from
 * the `x-nonce` request header for the inline theme script. Every page is
 * therefore rendered at request time (a prerendered page would carry no nonce).
 *
 * Styles: <style>/<link> elements need the nonce or must come from 'self'
 * (`style-src-elem`), but inline style *attributes* are allowed
 * (`style-src-attr 'unsafe-inline'`). They can't be avoided: KaTeX's server
 * HTML positions glyphs with style="…" attributes, and React `style` props
 * (progress bars, heatmap cells, @xyflow/react node positions) are serialised
 * as attributes during SSR. Style attributes can't execute script; the
 * residual risk is CSS-based UI redress, which is limited because untrusted
 * Markdown is never rendered as raw HTML. `style-src 'self' 'unsafe-inline'`
 * is only the fallback for browsers without the -elem/-attr directives.
 *
 * Paths under /lti/ may auto-submit a form back to the learning platform
 * (LTI deep-linking response), so `form-action` is omitted there.
 *
 * Framing: everything is `frame-ancestors 'self'` except LTI routes (/lti/*,
 * /api/lti/*), which Canvas opens inside an iframe on its own host (the
 * deep-linking picker, and launches configured to open inline). Those also
 * allow the LMS hosts from `LTI_ALLOWED_HOSTS` (default *.instructure.com,
 * *.canvaslms.com), https only. X-Frame-Options is dropped for those routes in
 * next.config.ts (it can't express an allow-list).
 */
import { urlPolicyFromEnv } from "@/modules/integrations/lms/lti/urlPolicy";

export interface CspOptions {
  nonce: string;
  pathname: string;
  /** `next dev`: React needs eval for debugging, HMR injects <style> without a nonce. */
  dev: boolean;
  /** Add `upgrade-insecure-requests` (production served over https only). */
  upgradeInsecure: boolean;
}

/** LTI routes: may post a form to the LMS and may be framed by it. */
export function isLtiPath(pathname: string): boolean {
  return pathname === "/lti" || pathname.startsWith("/lti/") || pathname.startsWith("/api/lti/");
}

/** Paths whose pages may post a form to an external (LMS) origin. */
export const allowsExternalFormAction = isLtiPath;

// A CSP host-source we are willing to emit: hostname or `*.suffix`, optional port.
const HOST_SOURCE = /^(\*\.)?[a-z0-9-]+(\.[a-z0-9-]+)+(:\d{1,5})?$/;

/**
 * `frame-ancestors` sources for a path: `'self'`, plus `https://<host>` for each
 * allow-listed LMS host on LTI routes. Patterns that aren't plain host names
 * are skipped rather than passed into the header.
 */
export function frameAncestors(
  pathname: string,
  env: Record<string, string | undefined> = process.env,
): string[] {
  if (!isLtiPath(pathname)) return ["'self'"];
  const hosts = urlPolicyFromEnv(env).allowedHosts.filter((h) => HOST_SOURCE.test(h));
  return ["'self'", ...hosts.map((h) => `https://${h}`)];
}

/** A base64 nonce from 16 random bytes (128 bits). */
export function createNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString("base64");
}

export function buildCsp({ nonce, pathname, dev, upgradeInsecure }: CspOptions): string {
  const n = `'nonce-${nonce}'`;
  const directives: [string, ...string[]][] = [
    ["default-src", "'self'"],
    ["script-src", "'self'", n, "'strict-dynamic'", ...(dev ? ["'unsafe-eval'"] : [])],
    ["style-src", "'self'", "'unsafe-inline'"],
    dev ? ["style-src-elem", "'self'", "'unsafe-inline'"] : ["style-src-elem", "'self'", n],
    ["style-src-attr", "'unsafe-inline'"],
    ["img-src", "'self'", "data:", "blob:"],
    ["font-src", "'self'", "data:"],
    ["connect-src", "'self'", ...(dev ? ["ws:", "wss:"] : [])],
    ["worker-src", "'self'"],
    ["manifest-src", "'self'"],
    ["media-src", "'self'"],
    ["frame-src", "'self'"],
    ["frame-ancestors", ...frameAncestors(pathname)],
    ["object-src", "'none'"],
    ["base-uri", "'self'"],
  ];
  if (!allowsExternalFormAction(pathname)) directives.push(["form-action", "'self'"]);
  if (upgradeInsecure) directives.push(["upgrade-insecure-requests"]);
  return directives.map((d) => d.join(" ")).join("; ");
}
