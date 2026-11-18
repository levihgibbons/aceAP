/**
 * LTI Deep Linking 2.0: the response a tool sends back after an instructor
 * picked AceAP activities inside the LMS.
 *
 * The response is a JWT signed with the tool key and delivered by an
 * auto-submitted browser form (field name `JWT`) to the platform's
 * `deep_link_return_url`.
 */
import { createHash, randomUUID } from "node:crypto";
import { frameAncestors } from "@/lib/csp";
import { fail, ok, type Clock, type DeepLinkItem, type DeepLinkingResponse, type DeepLinkingSettings, type LmsConnectionConfig, type LmsResult } from "../types";
import { signToolJwt } from "./keys";
import { CLAIM, LTI_VERSION } from "./launch";
import type { SignJwt } from "./token";

const DL = "https://purl.imsglobal.org/spec/lti-dl/claim";
export const DEEP_LINK_CLAIM = {
  contentItems: `${DL}/content_items`,
  data: `${DL}/data`,
  message: `${DL}/msg`,
} as const;

export const DEEP_LINKING_RESPONSE_TYPE = "LtiDeepLinkingResponse";
const RESPONSE_TTL_SECONDS = 300;

export interface LtiResourceLinkItem {
  type: "ltiResourceLink";
  title: string;
  url: string;
  text?: string;
  custom?: Record<string, string>;
  lineItem?: { scoreMaximum: number; label?: string; resourceId?: string; tag?: string };
  window?: { targetName?: string; width?: number; height?: number; windowFeatures?: string };
}

/** Convert AceAP activities to `ltiResourceLink` content items. */
export function buildContentItems(items: DeepLinkItem[]): LmsResult<LtiResourceLinkItem[]> {
  const out: LtiResourceLinkItem[] = [];
  for (const item of items) {
    if (!item.title.trim()) return fail("bad_request", "Every deep link item needs a title.");
    try {
      new URL(item.url);
    } catch {
      return fail("bad_request", `Deep link item "${item.title}" has an invalid URL.`);
    }
    const content: LtiResourceLinkItem = { type: "ltiResourceLink", title: item.title, url: item.url };
    if (item.text) content.text = item.text;
    if (item.custom && Object.keys(item.custom).length > 0) content.custom = { ...item.custom };
    if (item.lineItem) {
      if (!Number.isFinite(item.lineItem.scoreMaximum) || item.lineItem.scoreMaximum <= 0) {
        return fail("bad_request", `Deep link item "${item.title}" needs a positive scoreMaximum.`);
      }
      content.lineItem = { ...item.lineItem };
    }
    if (item.window) {
      const w: NonNullable<LtiResourceLinkItem["window"]> = {};
      if (item.window.targetName) w.targetName = item.window.targetName;
      if (item.window.width && item.window.width > 0) w.width = item.window.width;
      if (item.window.height && item.window.height > 0) w.height = item.window.height;
      if (item.window.windowFeatures) w.windowFeatures = item.window.windowFeatures;
      content.window = w;
    }
    out.push(content);
  }
  return ok(out);
}

export interface BuildDeepLinkingResponseInput {
  connection: LmsConnectionConfig;
  settings: DeepLinkingSettings;
  items: DeepLinkItem[];
  /** Optional plain-text message the platform may show to the instructor. */
  message?: string;
  now?: Clock;
  signJwt?: SignJwt;
}

/** Build the signed `LtiDeepLinkingResponse` JWT. */
export async function buildDeepLinkingResponse(input: BuildDeepLinkingResponseInput): Promise<LmsResult<DeepLinkingResponse>> {
  const { connection, settings } = input;
  if (input.items.length > 0 && !settings.acceptTypes.includes("ltiResourceLink")) {
    return fail("bad_request", "The LMS does not accept LTI resource links in this placement.");
  }
  if (input.items.length > 1 && !settings.acceptMultiple) {
    return fail("bad_request", "The LMS accepts only one item in this placement.");
  }
  const contentItems = buildContentItems(input.items);
  if (!contentItems.ok) return contentItems;

  const claims: Record<string, unknown> = {
    iss: connection.clientId,
    aud: connection.issuer,
    nonce: randomUUID(),
    [CLAIM.messageType]: DEEP_LINKING_RESPONSE_TYPE,
    [CLAIM.version]: LTI_VERSION,
    [CLAIM.deploymentId]: connection.deploymentId,
    [DEEP_LINK_CLAIM.contentItems]: contentItems.value,
  };
  // The opaque `data` value must be echoed back unchanged when the platform sent one.
  if (settings.data !== null) claims[DEEP_LINK_CLAIM.data] = settings.data;
  if (input.message) claims[DEEP_LINK_CLAIM.message] = input.message;

  const jwt = await (input.signJwt ?? signToolJwt)(claims, { expiresInSeconds: RESPONSE_TTL_SECONDS, now: input.now });
  if (!jwt.ok) return jwt;
  return ok({ jwt: jwt.value, returnUrl: settings.deepLinkReturnUrl });
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/** Minimal auto-submitting HTML form that returns the response to the platform. */
export function renderDeepLinkingForm(response: DeepLinkingResponse): string {
  return [
    "<!doctype html>",
    '<html lang="en"><head><meta charset="utf-8"><title>Returning to your LMS…</title></head>',
    '<body onload="document.forms[0].submit()">',
    `<form method="post" action="${escapeHtml(response.returnUrl)}">`,
    `<input type="hidden" name="JWT" value="${escapeHtml(response.jwt)}">`,
    "<noscript><button type=\"submit\">Return to your LMS</button></noscript>",
    "</form></body></html>",
  ].join("");
}

const AUTO_SUBMIT_SCRIPT = "document.getElementById('aceap-dl').submit();";

/**
 * Full response page for the deep-linking return, with its own strict CSP:
 * no resources except one hashed inline script that submits the form. A
 * visible button is the fallback when scripts are blocked. `form-action` is
 * deliberately not set (as for /lti/* pages in src/lib/csp.ts): browsers apply
 * it to redirects after the POST, and where the LMS redirects next is not
 * known. The return URL itself comes from a signed, validated launch and has
 * passed the LMS URL policy. Everything interpolated is escaped.
 */
export function renderDeepLinkingPage(response: DeepLinkingResponse, options: { itemCount: number }): { html: string; csp: string } {
  const scriptHash = createHash("sha256").update(AUTO_SUBMIT_SCRIPT).digest("base64");
  const what = options.itemCount === 0 ? "Returning to your LMS without adding anything." : `Sending ${options.itemCount} AceAP ${options.itemCount === 1 ? "activity" : "activities"} to your LMS…`;
  const html = [
    "<!doctype html>",
    '<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Returning to your LMS · AceAP</title>',
    "<style>body{font:16px/1.6 system-ui,sans-serif;margin:0;min-height:100vh;display:grid;place-items:center;background:#f6f5f1;color:#1c1b18}main{max-width:32rem;padding:2rem}button{font:inherit;padding:.5rem 1rem;border-radius:.5rem;border:1px solid #1c1b18;background:#1c1b18;color:#fff;cursor:pointer}@media (prefers-color-scheme:dark){body{background:#121315;color:#edecea}button{background:#edecea;color:#121315;border-color:#edecea}}</style>",
    "</head><body><main>",
    `<h1 style="font-size:1.25rem">${escapeHtml(what)}</h1>`,
    `<form id="aceap-dl" method="post" action="${escapeHtml(response.returnUrl)}">`,
    `<input type="hidden" name="JWT" value="${escapeHtml(response.jwt)}">`,
    "<p>If nothing happens, select the button.</p>",
    '<button type="submit">Return to your LMS</button>',
    "</form>",
    `<script>${AUTO_SUBMIT_SCRIPT}</script>`,
    "</main></body></html>",
  ].join("");
  const csp = [
    "default-src 'none'",
    `script-src 'sha256-${scriptHash}'`,
    "style-src 'unsafe-inline'",
    "base-uri 'none'",
    // Shown inside the LMS's picker iframe: allow the LMS hosts as well as AceAP.
    `frame-ancestors ${frameAncestors("/api/lti/deep-link").join(" ")}`,
  ].join("; ");
  return { html, csp };
}
