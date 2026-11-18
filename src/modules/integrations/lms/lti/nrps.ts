/**
 * LTI Names and Role Provisioning Services 2.0: context membership (roster).
 *
 * Pagination follows the `Link: <…>; rel="next"` response header. Names and
 * e-mail addresses are passed through only when the platform sent them (they
 * depend on the tool's privacy level) and are never used to link identities.
 */
import { fail, ok, type LmsConnectionConfig, type LmsResult, type Roster, type RosterMember } from "../types";
import type { AccessTokenClient } from "./token";
import { checkServiceUrl, type UrlPolicy } from "./urlPolicy";

export const NRPS_SCOPE = "https://purl.imsglobal.org/spec/lti-nrps/scope/contextmembership.readonly";
export const NRPS_MEDIA = "application/vnd.ims.lti-nrps.v2.membershipcontainer+json";
export const DEFAULT_MAX_ROSTER_PAGES = 100;

/**
 * URL of the `rel="next"` entry of a Link header (RFC 8288), resolved against
 * the URL that was just fetched. Null when there is no next page.
 */
export function parseNextLink(header: string | null, currentUrl: string): string | null {
  if (!header) return null;
  for (const match of header.matchAll(/<([^>]*)>([^,]*)/g)) {
    const rel = /;\s*rel\s*=\s*"?([^";]*)"?/i.exec(match[2]);
    if (!rel || !rel[1].trim().toLowerCase().split(/\s+/).includes("next")) continue;
    try {
      return new URL(match[1].trim(), currentUrl).toString();
    } catch {
      return null;
    }
  }
  return null;
}

function optional(value: unknown): string | undefined {
  return typeof value === "string" && value !== "" ? value : undefined;
}

function parseMember(value: unknown): RosterMember | null {
  if (typeof value !== "object" || value === null) return null;
  const v = value as Record<string, unknown>;
  if (typeof v.user_id !== "string" || v.user_id === "") return null;
  const member: RosterMember = {
    userId: v.user_id,
    roles: Array.isArray(v.roles) ? v.roles.filter((r): r is string => typeof r === "string") : [],
    status: optional(v.status) ?? "Active",
  };
  const name = optional(v.name);
  const givenName = optional(v.given_name);
  const familyName = optional(v.family_name);
  const email = optional(v.email);
  const sourcedId = optional(v.lis_person_sourcedid);
  if (name) member.name = name;
  if (givenName) member.givenName = givenName;
  if (familyName) member.familyName = familyName;
  if (email) member.email = email;
  if (sourcedId) member.lisPersonSourcedId = sourcedId;
  return member;
}

export class NrpsClient {
  constructor(
    private readonly tokens: AccessTokenClient,
    private readonly deps: { urlPolicy?: UrlPolicy } = {},
  ) {}

  /** Fetch every page of a context's membership. */
  async fetchRoster(
    connection: LmsConnectionConfig,
    membershipsUrl: string,
    options: { role?: string; limit?: number; maxPages?: number } = {},
  ): Promise<LmsResult<Roster>> {
    const allowed = checkServiceUrl(membershipsUrl, connection, this.deps.urlPolicy);
    if (!allowed.ok) return fail("bad_request", `Memberships URL ${allowed.reason}`);
    const first = new URL(membershipsUrl);
    if (options.role) first.searchParams.set("role", options.role);
    if (options.limit) first.searchParams.set("limit", String(options.limit));
    const origin = first.origin;
    const maxPages = options.maxPages ?? DEFAULT_MAX_ROSTER_PAGES;

    const members: RosterMember[] = [];
    let contextId: string | null = null;
    let pages = 0;
    let next: string | null = first.toString();
    while (next) {
      if (pages >= maxPages) return fail("platform_error", `Roster has more than ${maxPages} pages; stopped to avoid an endless loop.`);
      const current: string = next;
      // Never send the bearer token to a different host than the one the platform gave us.
      if (new URL(current).origin !== origin) return fail("platform_error", "Roster pagination pointed at a different host.");
      const response = await this.tokens.authorizedFetch(connection, [NRPS_SCOPE], current, { method: "GET", headers: { accept: NRPS_MEDIA } }, "Roster request");
      if (!response.ok) return response;
      pages += 1;

      let json: unknown;
      try {
        json = await response.value.json();
      } catch {
        return fail("platform_error", "Roster response was not valid JSON.", { status: response.value.status });
      }
      const body = typeof json === "object" && json !== null ? (json as { members?: unknown; context?: { id?: unknown } }) : null;
      if (!body || !Array.isArray(body.members)) return fail("platform_error", "Roster response has no members array.", { status: response.value.status });
      if (contextId === null && typeof body.context?.id === "string") contextId = body.context.id;
      for (const raw of body.members) {
        const member = parseMember(raw);
        if (member) members.push(member);
      }
      next = parseNextLink(response.value.headers.get("link"), current);
    }
    return ok({ contextId, members, pages });
  }
}
