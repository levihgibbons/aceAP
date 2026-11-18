/**
 * LTI Assignment and Grade Services 2.0: line items and score publishing.
 *
 * A score is reported as delivered only when the platform's score endpoint
 * answered 2xx. Every other outcome is a typed error:
 *   401/403 or missing scope → permission_denied (job becomes "blocked")
 *   5xx / throttling / network → platform_error   (retryable)
 *   other 4xx                 → bad_request       (not retryable)
 */
import {
  fail,
  ok,
  systemClock,
  type Clock,
  type LineItem,
  type LineItemSpec,
  type LmsConnectionConfig,
  type LmsResult,
  type ScoreInput,
  type ScorePayload,
  type ScoreReceipt,
} from "../types";
import { parseNextLink } from "./nrps";
import type { AccessTokenClient } from "./token";
import { checkServiceUrl, type UrlPolicy } from "./urlPolicy";

export const AGS_SCOPE = {
  lineItem: "https://purl.imsglobal.org/spec/lti-ags/scope/lineitem",
  lineItemReadonly: "https://purl.imsglobal.org/spec/lti-ags/scope/lineitem.readonly",
  resultReadonly: "https://purl.imsglobal.org/spec/lti-ags/scope/result.readonly",
  score: "https://purl.imsglobal.org/spec/lti-ags/scope/score",
} as const;

export const AGS_MEDIA = {
  lineItem: "application/vnd.ims.lis.v2.lineitem+json",
  lineItemContainer: "application/vnd.ims.lis.v2.lineitemcontainer+json",
  score: "application/vnd.ims.lis.v1.score+json",
} as const;

const MAX_LINE_ITEM_PAGES = 5;

/** The scores endpoint is the line item URL with `/scores` appended to its path; query parameters are kept. */
export function scoresUrl(lineItemUrl: string): string {
  const url = new URL(lineItemUrl);
  url.pathname = `${url.pathname.replace(/\/+$/, "")}/scores`;
  return url.toString();
}

/** Validate a score and put it into wire format. */
export function buildScorePayload(input: ScoreInput, timestamp: string): LmsResult<ScorePayload> {
  if (!input.userId) return fail("bad_request", "Score has no platform user id.");
  if (!Number.isFinite(input.scoreGiven) || input.scoreGiven < 0) return fail("bad_request", "scoreGiven must be a non-negative number.");
  if (!Number.isFinite(input.scoreMaximum) || input.scoreMaximum <= 0) return fail("bad_request", "scoreMaximum must be a positive number.");
  const payload: ScorePayload = {
    userId: input.userId,
    scoreGiven: input.scoreGiven,
    scoreMaximum: input.scoreMaximum,
    activityProgress: input.activityProgress ?? "Completed",
    gradingProgress: input.gradingProgress ?? "FullyGraded",
    timestamp,
  };
  if (input.comment) payload.comment = input.comment;
  return ok(payload);
}

/**
 * Issues ISO 8601 timestamps that strictly increase per key (line item + user),
 * as AGS requires, even when two scores are published within one millisecond.
 * Process-local: across processes the wall clock provides the ordering.
 */
export class TimestampSequencer {
  private readonly last = new Map<string, number>();

  constructor(
    private readonly now: Clock = systemClock,
    private readonly maxEntries = 10_000,
  ) {}

  next(key: string): string {
    const nowMs = this.now().getTime();
    const value = Math.max(nowMs, (this.last.get(key) ?? -Infinity) + 1);
    if (this.last.size >= this.maxEntries) {
      for (const [k, v] of this.last) if (v < nowMs) this.last.delete(k);
    }
    this.last.set(key, value);
    return new Date(value).toISOString();
  }
}

function parseLineItem(value: unknown): LineItem | null {
  if (typeof value !== "object" || value === null) return null;
  const v = value as Record<string, unknown>;
  if (typeof v.id !== "string" || typeof v.label !== "string" || typeof v.scoreMaximum !== "number") return null;
  const item: LineItem = { id: v.id, label: v.label, scoreMaximum: v.scoreMaximum };
  if (typeof v.resourceId === "string") item.resourceId = v.resourceId;
  if (typeof v.resourceLinkId === "string") item.resourceLinkId = v.resourceLinkId;
  if (typeof v.tag === "string") item.tag = v.tag;
  return item;
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

export class AgsClient {
  private readonly timestamps: TimestampSequencer;
  private readonly urlPolicy: UrlPolicy | undefined;

  constructor(
    private readonly tokens: AccessTokenClient,
    deps: { now?: Clock; urlPolicy?: UrlPolicy } = {},
  ) {
    this.timestamps = new TimestampSequencer(deps.now);
    this.urlPolicy = deps.urlPolicy;
  }

  /** Allow-listed AND on the connection's own API host (never send the bearer token elsewhere). */
  private checkUrl(url: string, connection: LmsConnectionConfig, what: string): LmsResult<true> {
    const checked = checkServiceUrl(url, connection, this.urlPolicy);
    return checked.ok ? ok(true) : fail("bad_request", `${what} ${checked.reason}`);
  }

  /** First line item in the container matching the filters, or null when there is none. */
  async findLineItem(
    connection: LmsConnectionConfig,
    lineItemsUrl: string,
    query: { resourceLinkId?: string; resourceId?: string; tag?: string },
  ): Promise<LmsResult<LineItem | null>> {
    const allowed = this.checkUrl(lineItemsUrl, connection, "Line items URL");
    if (!allowed.ok) return allowed;
    const first = new URL(lineItemsUrl);
    if (query.resourceLinkId) first.searchParams.set("resource_link_id", query.resourceLinkId);
    if (query.resourceId) first.searchParams.set("resource_id", query.resourceId);
    if (query.tag) first.searchParams.set("tag", query.tag);

    let next: string | null = first.toString();
    for (let page = 0; next && page < MAX_LINE_ITEM_PAGES; page += 1) {
      const current: string = next;
      // Never send the bearer token to a different host than the one the platform gave us.
      if (new URL(current).origin !== first.origin) return fail("platform_error", "Line item pagination pointed at a different host.");
      const response = await this.tokens.authorizedFetch(connection, [AGS_SCOPE.lineItem], current, { method: "GET", headers: { accept: AGS_MEDIA.lineItemContainer } }, "Line item lookup");
      if (!response.ok) return response;
      const json = await readJson(response.value);
      if (!Array.isArray(json)) return fail("platform_error", "Line item lookup returned an unexpected body.", { status: response.value.status });
      const items = json.map(parseLineItem).filter((item): item is LineItem => item !== null);
      if (items.length > 0) return ok(items[0]);
      next = parseNextLink(response.value.headers.get("link"), current);
    }
    return ok(null);
  }

  async createLineItem(connection: LmsConnectionConfig, lineItemsUrl: string, spec: LineItemSpec): Promise<LmsResult<LineItem>> {
    if (!spec.label.trim()) return fail("bad_request", "Line item label is required.");
    if (!Number.isFinite(spec.scoreMaximum) || spec.scoreMaximum <= 0) return fail("bad_request", "Line item scoreMaximum must be a positive number.");
    const allowed = this.checkUrl(lineItemsUrl, connection, "Line items URL");
    if (!allowed.ok) return allowed;
    const response = await this.tokens.authorizedFetch(
      connection,
      [AGS_SCOPE.lineItem],
      lineItemsUrl,
      { method: "POST", headers: { "content-type": AGS_MEDIA.lineItem, accept: AGS_MEDIA.lineItem }, body: JSON.stringify(spec) },
      "Line item creation",
    );
    if (!response.ok) return response;
    const item = parseLineItem(await readJson(response.value));
    if (!item) return fail("platform_error", "Line item creation returned an unexpected body.", { status: response.value.status });
    return ok(item);
  }

  /** POST a score. `ok` means the platform answered 2xx — nothing less. */
  async publishScore(connection: LmsConnectionConfig, lineItemUrl: string, input: ScoreInput): Promise<LmsResult<ScoreReceipt>> {
    const allowed = this.checkUrl(lineItemUrl, connection, "Line item URL");
    if (!allowed.ok) return allowed;
    const payload = buildScorePayload(input, this.timestamps.next(`${lineItemUrl}|${input.userId}`));
    if (!payload.ok) return payload;
    const response = await this.tokens.authorizedFetch(
      connection,
      [AGS_SCOPE.score],
      scoresUrl(lineItemUrl),
      { method: "POST", headers: { "content-type": AGS_MEDIA.score, accept: "application/json" }, body: JSON.stringify(payload.value) },
      "Score publish",
    );
    if (!response.ok) return response;
    const json = await readJson(response.value);
    const resultUrl = typeof json === "object" && json !== null && typeof (json as { resultUrl?: unknown }).resultUrl === "string" ? (json as { resultUrl: string }).resultUrl : null;
    return ok({ status: response.value.status, timestamp: payload.value.timestamp, resultUrl });
  }
}
