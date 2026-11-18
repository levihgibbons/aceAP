/**
 * Content-Security-Policy builder (src/lib/csp.ts) and the proxy that applies
 * it (src/proxy.ts): strict nonce-based scripts in production, the dev-only
 * relaxations, the LTI form-action exemption, upgrade-insecure-requests only
 * over https, and the unchanged signed-out redirect.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { allowsExternalFormAction, buildCsp, createNonce, frameAncestors } from "@/lib/csp";
import { proxy } from "@/proxy";

function parse(csp: string): Map<string, string[]> {
  return new Map(
    csp.split(";").map((d) => {
      const [name, ...values] = d.trim().split(/\s+/);
      return [name, values] as [string, string[]];
    }),
  );
}

describe("buildCsp", () => {
  const base = { nonce: "abc123==", pathname: "/app", dev: false, upgradeInsecure: false };

  it("production: nonce + strict-dynamic scripts, no unsafe-inline/eval for scripts", () => {
    const d = parse(buildCsp(base));
    expect(d.get("script-src")).toEqual(["'self'", "'nonce-abc123=='", "'strict-dynamic'"]);
    expect(d.get("style-src-elem")).toEqual(["'self'", "'nonce-abc123=='"]);
    expect(d.get("style-src-attr")).toEqual(["'unsafe-inline'"]);
    expect(d.get("object-src")).toEqual(["'none'"]);
    expect(d.get("frame-ancestors")).toEqual(["'self'"]);
    expect(d.get("form-action")).toEqual(["'self'"]);
    expect(d.get("connect-src")).toEqual(["'self'"]);
    expect(d.has("upgrade-insecure-requests")).toBe(false);
    expect(buildCsp(base)).not.toContain("unsafe-eval");
  });

  it("development: adds unsafe-eval for React debugging and unnonced styles for HMR", () => {
    const d = parse(buildCsp({ ...base, dev: true }));
    expect(d.get("script-src")).toContain("'unsafe-eval'");
    expect(d.get("style-src-elem")).toEqual(["'self'", "'unsafe-inline'"]);
    expect(d.get("connect-src")).toEqual(["'self'", "ws:", "wss:"]);
  });

  it("omits form-action only for LTI paths", () => {
    for (const p of ["/lti", "/lti/link", "/lti/deep-link", "/api/lti/launch"]) {
      expect(allowsExternalFormAction(p)).toBe(true);
      expect(parse(buildCsp({ ...base, pathname: p })).has("form-action")).toBe(false);
    }
    for (const p of ["/", "/app", "/ltix", "/teacher/integrations"]) {
      expect(allowsExternalFormAction(p)).toBe(false);
    }
  });

  it("frame-ancestors: 'self' everywhere, plus the LMS allow-list on LTI routes only", () => {
    expect(parse(buildCsp(base)).get("frame-ancestors")).toEqual(["'self'"]);
    expect(parse(buildCsp({ ...base, pathname: "/lti/deep-link" })).get("frame-ancestors")).toEqual(
      ["'self'", "https://*.instructure.com", "https://*.canvaslms.com"],
    );
    expect(
      frameAncestors("/api/lti/launch", { LTI_ALLOWED_HOSTS: "canvas.school.edu, *.lms.example" }),
    ).toEqual(["'self'", "https://canvas.school.edu", "https://*.lms.example"]);
    // Anything that isn't a plain host pattern never reaches the header.
    expect(
      frameAncestors("/lti/link", { LTI_ALLOWED_HOSTS: "evil.com; script-src *,ok.example.org,*" }),
    ).toEqual(["'self'", "https://ok.example.org"]);
    expect(frameAncestors("/teacher", { LTI_ALLOWED_HOSTS: "canvas.school.edu" })).toEqual([
      "'self'",
    ]);
  });

  it("adds upgrade-insecure-requests when asked", () => {
    expect(
      parse(buildCsp({ ...base, upgradeInsecure: true })).has("upgrade-insecure-requests"),
    ).toBe(true);
  });

  it("nonces are random base64 strings", () => {
    const a = createNonce();
    expect(a).toMatch(/^[A-Za-z0-9+/]{22}==$/);
    expect(createNonce()).not.toBe(a);
  });
});

describe("proxy", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("redirects signed-out requests for signed-in areas to /login (unchanged)", () => {
    const res = proxy(new NextRequest("http://localhost/teacher/classes?x=1"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(
      "http://localhost/login?next=%2Fteacher%2Fclasses%3Fx%3D1",
    );
    expect(res.headers.get("content-security-policy")).toBeNull();
  });

  it("sets a per-request CSP on pages and forwards the nonce to rendering", () => {
    const res = proxy(new NextRequest("http://localhost/login"));
    const csp = res.headers.get("content-security-policy")!;
    const nonce = csp.match(/'nonce-([^']+)'/)![1];
    // Request headers forwarded to the render are encoded on the response by NextResponse.next().
    expect(res.headers.get("x-middleware-request-x-nonce")).toBe(nonce);
    expect(res.headers.get("x-middleware-request-content-security-policy")).toBe(csp);
    const second = proxy(new NextRequest("http://localhost/login")).headers.get(
      "content-security-policy",
    );
    expect(second).not.toBe(csp);
  });

  it("signed-in requests pass through with a CSP", () => {
    const req = new NextRequest("http://localhost/app", {
      headers: { cookie: "aceap_session=tok" },
    });
    const res = proxy(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-security-policy")).toContain("'strict-dynamic'");
  });

  it("upgrade-insecure-requests + HSTS only for production over https", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ACEAP_INSECURE_COOKIES", "");
    const https = proxy(
      new NextRequest("http://localhost/", { headers: { "x-forwarded-proto": "https" } }),
    );
    expect(https.headers.get("content-security-policy")).toContain("upgrade-insecure-requests");
    expect(https.headers.get("strict-transport-security")).toBe("max-age=63072000");

    const http = proxy(new NextRequest("http://localhost/"));
    expect(http.headers.get("content-security-policy")).not.toContain("upgrade-insecure-requests");
    expect(http.headers.get("strict-transport-security")).toBeNull();

    vi.stubEnv("ACEAP_INSECURE_COOKIES", "1");
    const e2e = proxy(new NextRequest("https://localhost/"));
    expect(e2e.headers.get("content-security-policy")).not.toContain("upgrade-insecure-requests");
  });
});
