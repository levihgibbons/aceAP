/**
 * Outbound URL policy for LMS endpoints (SSRF hardening).
 *
 * Every URL AceAP's server fetches on behalf of an LMS connection — the
 * platform JWKS, the OAuth2 token endpoint, AGS line item / score URLs and
 * NRPS membership URLs — and the auth login URL the browser is sent to must:
 *
 *   1. be https (plain http only for localhost / 127.0.0.1 / [::1], and only
 *      when NODE_ENV !== "production");
 *   2. carry no credentials (`user:pass@`);
 *   3. not be a private, loopback, link-local, CGNAT, multicast or unspecified
 *      IP literal (localhost exemption as above);
 *   4. have a hostname on the allow-list: `LTI_ALLOWED_HOSTS` (comma-separated;
 *      `*.example.com` matches any subdomain of example.com, not example.com
 *      itself; anything else is an exact match). Default:
 *      `*.instructure.com,*.canvaslms.com`.
 *
 * Service URLs taken from launches (line items, memberships) must additionally
 * be on the same origin as the connection's token endpoint (`sameOriginAs`).
 *
 * These checks are syntactic. DNS rebinding (an allow-listed name resolving to
 * a private address) is handled per request by `dnsGuard.ts`, which resolves
 * the hostname with `isNonPublicAddress` below and pins the connection to the
 * validated address.
 */

export const DEFAULT_LTI_ALLOWED_HOSTS = ["*.instructure.com", "*.canvaslms.com"] as const;

export interface UrlPolicy {
  /** Host patterns: exact hostnames or `*.suffix` wildcards. */
  allowedHosts: string[];
  /** Permit localhost / 127.0.0.1 / [::1] (http or https). Never true in production. */
  allowLocalDev: boolean;
}

export type UrlCheck = { ok: true; url: URL } | { ok: false; reason: string };

type Env = Record<string, string | undefined>;

/** Parse a comma-separated host list; empty entries are ignored. */
export function parseAllowedHosts(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((h) => h.trim().toLowerCase().replace(/\.$/, ""))
    .filter(Boolean);
}

/** The policy in force, read at call time so configuration changes apply without a restart in tests/scripts. */
export function urlPolicyFromEnv(env: Env = process.env): UrlPolicy {
  const configured = parseAllowedHosts(env.LTI_ALLOWED_HOSTS);
  return {
    allowedHosts: configured.length > 0 ? configured : [...DEFAULT_LTI_ALLOWED_HOSTS],
    allowLocalDev: env.NODE_ENV !== "production",
  };
}

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

/** localhost / 127.0.0.1 / [::1] — the development exemption (never in production). */
export function isLocalDevHost(hostname: string): boolean {
  return LOCAL_HOSTS.has(hostname.toLowerCase().replace(/\.$/, ""));
}

function parseIpv4(host: string): number[] | null {
  const parts = host.split(".");
  if (parts.length !== 4) return null;
  const nums = parts.map((p) => (/^\d{1,3}$/.test(p) ? Number(p) : NaN));
  return nums.every((n) => Number.isInteger(n) && n >= 0 && n <= 255) ? nums : null;
}

function privateIpv4([a, b]: number[]): boolean {
  return (
    a === 0 || // "this" network
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) || // CGNAT
    (a === 169 && b === 254) || // link-local (cloud metadata lives here)
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0) || // IETF protocol assignments
    (a === 198 && (b === 18 || b === 19)) || // benchmarking
    a >= 224 // multicast + reserved + broadcast
  );
}

/** Expand an IPv6 literal (without brackets) to eight 16-bit groups; null when not IPv6. */
function parseIpv6(host: string): number[] | null {
  if (!host.includes(":")) return null;
  let text = host.toLowerCase();
  // Trailing embedded IPv4 (e.g. ::ffff:10.0.0.1).
  const v4 = /(\d+\.\d+\.\d+\.\d+)$/.exec(text);
  if (v4) {
    const n = parseIpv4(v4[1]);
    if (!n) return null;
    text = `${text.slice(0, -v4[1].length)}${((n[0] << 8) | n[1]).toString(16)}:${((n[2] << 8) | n[3]).toString(16)}`;
  }
  const halves = text.split("::");
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(":") : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const fill = halves.length === 2 ? 8 - head.length - tail.length : 0;
  if (fill < 0 || (halves.length === 1 && head.length !== 8)) return null;
  const groups = [...head, ...Array<string>(fill).fill("0"), ...tail].map((g) => (/^[0-9a-f]{1,4}$/.test(g) ? parseInt(g, 16) : NaN));
  return groups.length === 8 && groups.every((g) => Number.isInteger(g)) ? groups : null;
}

const embeddedIpv4 = (hi: number, lo: number): number[] => [hi >> 8, hi & 0xff, lo >> 8, lo & 0xff];

function privateIpv6(g: number[]): boolean {
  if (g.every((x) => x === 0)) return true; // ::
  if (g.slice(0, 7).every((x) => x === 0) && g[7] === 1) return true; // ::1
  if ((g[0] & 0xfe00) === 0xfc00) return true; // fc00::/7 unique local
  if ((g[0] & 0xffc0) === 0xfe80) return true; // fe80::/10 link-local
  if ((g[0] & 0xffc0) === 0xfec0) return true; // fec0::/10 site-local (deprecated, still routed internally)
  if ((g[0] & 0xff00) === 0xff00) return true; // multicast
  if (g[0] === 0x0100 && g[1] === 0 && g[2] === 0 && g[3] === 0) return true; // 100::/64 discard
  if (g[0] === 0x2001 && g[1] === 0x0db8) return true; // 2001:db8::/32 documentation
  if (g[0] === 0x2001 && g[1] === 0) return true; // 2001::/32 Teredo (embeds an obfuscated client address)
  // IPv4-mapped / -compatible: judge the embedded IPv4 address.
  const mapped = g.slice(0, 5).every((x) => x === 0) && (g[5] === 0xffff || g[5] === 0);
  if (mapped) return privateIpv4(embeddedIpv4(g[6], g[7]));
  // NAT64 (64:ff9b::/96 well-known, 64:ff9b:1::/48 local-use): the gateway forwards to the embedded IPv4.
  if (g[0] === 0x0064 && g[1] === 0xff9b && (g[2] === 1 || g.slice(2, 6).every((x) => x === 0))) return g[2] === 1 || privateIpv4(embeddedIpv4(g[6], g[7]));
  // 6to4 (2002::/16): the relay forwards to the IPv4 address in bits 16–47.
  if (g[0] === 0x2002) return privateIpv4(embeddedIpv4(g[1], g[2]));
  return false;
}

/** True when `hostname` (as in `URL.hostname`) is an IP literal in a non-public range. */
export function isPrivateIpLiteral(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  const v4 = parseIpv4(host);
  if (v4) return privateIpv4(v4);
  const v6 = parseIpv6(host);
  return v6 ? privateIpv6(v6) : false;
}

/**
 * True unless `address` (a resolved IP address as returned by `dns.lookup`, an
 * optional `%zone` suffix allowed) is a public unicast address. Fails closed:
 * anything that does not parse as IPv4 or IPv6 counts as non-public.
 */
export function isNonPublicAddress(address: string): boolean {
  const host = address.toLowerCase().replace(/^\[|\]$/g, "").replace(/%.*$/, "");
  const v4 = parseIpv4(host);
  if (v4) return privateIpv4(v4);
  const v6 = parseIpv6(host);
  return v6 ? privateIpv6(v6) : true;
}

function isIpLiteral(hostname: string): boolean {
  const host = hostname.replace(/^\[|\]$/g, "");
  return parseIpv4(host) !== null || parseIpv6(host) !== null;
}

/** `*.example.com` matches strict subdomains of example.com; other patterns match exactly. */
export function hostMatches(hostname: string, pattern: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  const p = pattern.toLowerCase().replace(/\.$/, "");
  if (p.startsWith("*.")) {
    const suffix = p.slice(1); // ".example.com"
    return suffix.length > 1 && host.endsWith(suffix) && host.length > suffix.length;
  }
  return host === p;
}

/** Check one URL against the policy. The reason is safe to show to staff. */
export function checkLmsUrl(value: string, policy: UrlPolicy = urlPolicyFromEnv()): UrlCheck {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return { ok: false, reason: "is not a valid URL." };
  }
  if (url.username || url.password) return { ok: false, reason: "must not contain a user name or password." };
  const host = url.hostname.toLowerCase().replace(/\.$/, "");

  if (LOCAL_HOSTS.has(host)) {
    if (!policy.allowLocalDev) return { ok: false, reason: "must not point at localhost in production." };
    return url.protocol === "https:" || url.protocol === "http:" ? { ok: true, url } : { ok: false, reason: "must be an https:// URL." };
  }
  if (url.protocol !== "https:") return { ok: false, reason: "must be an https:// URL (http:// is allowed for localhost in development only)." };
  if (isPrivateIpLiteral(host)) return { ok: false, reason: "must not point at a private, loopback or link-local address." };
  if (!policy.allowedHosts.some((pattern) => (isIpLiteral(host) ? host === pattern : hostMatches(host, pattern)))) {
    return { ok: false, reason: `host "${host}" is not on the LMS allow-list (LTI_ALLOWED_HOSTS: ${policy.allowedHosts.join(", ")}).` };
  }
  return { ok: true, url };
}

export function isAllowedLmsUrl(value: string, policy?: UrlPolicy): boolean {
  return checkLmsUrl(value, policy).ok;
}

/** Same scheme, host and port. Used to keep service URLs on the connection's own platform host. */
export function sameOriginAs(value: string, reference: string): boolean {
  try {
    return new URL(value).origin === new URL(reference).origin;
  } catch {
    return false;
  }
}

/**
 * Policy + same-origin check for a service URL (line item, line items container,
 * memberships) of a connection: it must pass `checkLmsUrl` and share the origin
 * of the connection's token endpoint, which is the platform's API host.
 */
export function checkServiceUrl(value: string, connection: { authTokenUrl: string }, policy?: UrlPolicy): UrlCheck {
  const checked = checkLmsUrl(value, policy);
  if (!checked.ok) return checked;
  if (!sameOriginAs(value, connection.authTokenUrl)) {
    return { ok: false, reason: "must be on the same host as the connection's token endpoint." };
  }
  return checked;
}
