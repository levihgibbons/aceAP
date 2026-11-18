/**
 * DNS-rebinding defence for outbound LMS requests.
 *
 * `checkLmsUrl` (urlPolicy.ts) is syntactic: https, allow-listed hostname, no
 * private IP literal. An allow-listed *name* could still resolve to a private
 * address (DNS rebinding, a hijacked record, split-horizon DNS). Before every
 * outbound request `safeFetch` (token.ts) therefore calls `guardOutbound`:
 *
 *   1. resolve the hostname (`dns.lookup` with `all: true`, or an injected
 *      resolver);
 *   2. refuse when ANY resolved address is private, loopback, link-local,
 *      unique-local, CGNAT, multicast, unspecified or otherwise non-public
 *      (IPv4 and IPv6, IPv4-mapped / NAT64 / 6to4 judged by the embedded IPv4) —
 *      see `isNonPublicAddress`;
 *   3. send the request through `pinnedFetch`, a small `node:http(s)` transport
 *      whose socket `lookup` returns ONLY the address validated in step 2. The
 *      name is never resolved a second time, so there is no window between the
 *      check and the connection (no TOCTOU). TLS still verifies the
 *      certificate against the hostname (SNI and the identity check use the
 *      URL's hostname; only the IP the socket connects to is fixed).
 *
 * Node's global `fetch` (undici) would need the `undici` package for a custom
 * `connect.lookup`; it is not a dependency, so `node:https` is used instead.
 *
 * Exemptions, unchanged from the URL policy:
 *  - localhost / 127.0.0.1 / [::1] (allowed by the policy only outside
 *    production) are not resolved and use the global `fetch`;
 *  - an injected `fetch` without an injected resolver is a test transport
 *    (the in-repo mock platform) that never touches DNS, so no lookup is made.
 *    Production code never injects `fetch`. Tests that want the guard inject
 *    `resolveHost` as well; the injected `fetch` is then called only after the
 *    resolved addresses passed. Code without injectable deps (module-level
 *    adapters in routes) is tested by swapping `outboundDefaults`.
 */
import { lookup } from "node:dns/promises";
import * as http from "node:http";
import * as https from "node:https";
import { isIP, type LookupFunction } from "node:net";
import { fail, ok, type FetchLike, type LmsResult } from "../types";
import { isLocalDevHost, isNonPublicAddress } from "./urlPolicy";

export interface ResolvedAddress {
  address: string;
  family: 4 | 6;
}

/** Resolve a hostname to every address it has (like `dns.lookup(host, { all: true })`). */
export type HostResolver = (hostname: string) => Promise<ResolvedAddress[]>;

export const systemResolver: HostResolver = async (hostname) => {
  const results = await lookup(hostname, { all: true, verbatim: true });
  return results.map((r) => ({ address: r.address, family: r.family === 6 ? 6 : 4 }));
};

/** Upper bound for a buffered LMS response body (rosters are paginated; JWKS and tokens are tiny). */
export const MAX_RESPONSE_BYTES = 10 * 1024 * 1024;

export type AddressCheck = { ok: true; pinned: ResolvedAddress } | { ok: false; kind: "dns_failed" | "non_public"; reason: string };

function bareHost(hostname: string): string {
  return hostname.replace(/^\[|\]$/g, "").replace(/\.$/, "");
}

/**
 * Resolve `hostname` and check every address. Returns the address to pin the
 * connection to (the first one; all of them passed). IP literals are not
 * looked up. The reason is safe to show to staff (it never contains the
 * resolved address).
 */
export async function resolvePublicAddress(hostname: string, resolver: HostResolver = systemResolver): Promise<AddressCheck> {
  const host = bareHost(hostname);
  const literal = isIP(host);
  let addresses: ResolvedAddress[];
  if (literal) {
    addresses = [{ address: host, family: literal === 6 ? 6 : 4 }];
  } else {
    try {
      addresses = await resolver(host);
    } catch {
      return { ok: false, kind: "dns_failed", reason: `the host "${host}" could not be resolved.` };
    }
  }
  if (addresses.length === 0) return { ok: false, kind: "dns_failed", reason: `the host "${host}" did not resolve to any address.` };
  if (addresses.some((a) => typeof a?.address !== "string" || isNonPublicAddress(a.address))) {
    return { ok: false, kind: "non_public", reason: `the host "${host}" resolves to a private, loopback, link-local or otherwise non-public address; refusing to connect (DNS rebinding protection).` };
  }
  const first = addresses[0].address;
  return { ok: true, pinned: { address: first, family: isIP(first.replace(/%.*$/, "")) === 6 ? 6 : 4 } };
}

/**
 * Process-wide defaults used when no resolver / fetch is injected. A seam for
 * tests of code that builds its adapter at module level (e.g. the launch
 * route): they may swap these and must restore them. Production never changes
 * them.
 */
export const outboundDefaults: { resolver: HostResolver; transport: (pin: ResolvedAddress) => FetchLike } = {
  resolver: systemResolver,
  transport: (pin) => pinnedFetch(pin),
};

export interface GuardDeps {
  fetch?: FetchLike;
  resolveHost?: HostResolver;
}

/**
 * The transport to use for one request to `url` (already accepted by
 * `checkLmsUrl`), or a typed failure: `platform_error` when the name cannot be
 * resolved (retryable, like any network failure), `bad_request` when it
 * resolves to a non-public address.
 */
export async function guardOutbound(url: URL, deps: GuardDeps, what: string): Promise<LmsResult<FetchLike>> {
  if (isLocalDevHost(url.hostname)) return ok(deps.fetch ?? fetch);
  if (deps.fetch && !deps.resolveHost) return ok(deps.fetch);
  const checked = await resolvePublicAddress(url.hostname, deps.resolveHost ?? outboundDefaults.resolver);
  if (!checked.ok) {
    return checked.kind === "dns_failed"
      ? fail("platform_error", `${what} could not reach the platform: ${checked.reason}`)
      : fail("bad_request", `${what}: ${checked.reason}`);
  }
  return ok(deps.fetch ?? outboundDefaults.transport(checked.pinned));
}

// ───────────────────────────── Pinned transport ─────────────────────────────

function requestBody(body: RequestInit["body"], headers: Headers): Buffer | undefined {
  if (body === undefined || body === null) return undefined;
  if (typeof body === "string") return Buffer.from(body);
  if (body instanceof URLSearchParams) {
    if (!headers.has("content-type")) headers.set("content-type", "application/x-www-form-urlencoded;charset=UTF-8");
    return Buffer.from(body.toString());
  }
  if (body instanceof Uint8Array) return Buffer.from(body);
  if (body instanceof ArrayBuffer) return Buffer.from(new Uint8Array(body));
  throw new TypeError("Unsupported request body for the pinned LMS transport.");
}

const NULL_BODY_STATUS = new Set([101, 103, 204, 205, 304]);

/**
 * A minimal `fetch` over `node:http(s)` that connects only to `pin`. Never
 * follows redirects (a 3xx is returned as is), honours `init.signal`, buffers
 * the body up to `maxBytes`, and sends no `Accept-Encoding` (so bodies arrive
 * uncompressed).
 */
export function pinnedFetch(pin: ResolvedAddress, options: { maxBytes?: number } = {}): FetchLike {
  const maxBytes = options.maxBytes ?? MAX_RESPONSE_BYTES;
  return (input, init = {}) =>
    new Promise<Response>((resolve, reject) => {
      let settled = false;
      const done = (fn: () => void) => {
        if (settled) return;
        settled = true;
        fn();
      };
      try {
        const url = new URL(String(input));
        if (url.protocol !== "https:" && url.protocol !== "http:") throw new TypeError(`Unsupported protocol ${url.protocol}`);
        const method = (init.method ?? "GET").toUpperCase();
        const headers = new Headers(init.headers);
        const body = requestBody(init.body, headers);
        if (body) headers.set("content-length", String(body.length));
        const outgoing: Record<string, string> = {};
        headers.forEach((value, key) => {
          outgoing[key] = value;
        });

        // The ONLY address this socket may connect to. Handles both callback
        // shapes (`all: true` is used when Node's happy-eyeballs is enabled).
        const pinnedLookup: LookupFunction = (_hostname, lookupOptions, callback) => {
          if (lookupOptions.all) callback(null, [{ address: pin.address, family: pin.family }]);
          else callback(null, pin.address, pin.family);
        };

        const transport = url.protocol === "https:" ? https : http;
        const signal = init.signal ?? undefined;
        const req = transport.request(
          {
            protocol: url.protocol,
            hostname: bareHost(url.hostname),
            port: url.port || undefined,
            path: `${url.pathname}${url.search}`,
            method,
            headers: outgoing,
            lookup: pinnedLookup,
            agent: false, // a fresh connection per request: no pooled socket from another resolution
            signal,
          },
          (res) => {
            const chunks: Buffer[] = [];
            let size = 0;
            res.on("data", (chunk: Buffer) => {
              size += chunk.length;
              if (size > maxBytes) {
                const error = new Error(`Response body exceeds ${maxBytes} bytes.`);
                done(() => reject(error));
                req.destroy(error);
                return;
              }
              chunks.push(chunk);
            });
            res.on("error", (error) => done(() => reject(error)));
            res.on("end", () =>
              done(() => {
                try {
                  const status = res.statusCode ?? 0;
                  const responseHeaders = new Headers();
                  for (let i = 0; i + 1 < res.rawHeaders.length; i += 2) responseHeaders.append(res.rawHeaders[i], res.rawHeaders[i + 1]);
                  const nullBody = NULL_BODY_STATUS.has(status) || method === "HEAD";
                  resolve(new Response(nullBody ? null : new Uint8Array(Buffer.concat(chunks)), { status, statusText: res.statusMessage ?? "", headers: responseHeaders }));
                } catch (error) {
                  reject(error);
                }
              }),
            );
          },
        );
        req.on("error", (error) => done(() => reject(error)));
        if (body) req.write(body);
        req.end();
      } catch (error) {
        done(() => reject(error));
      }
    });
}
