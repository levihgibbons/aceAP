import type { NextConfig } from "next";

/**
 * AceAP renders per-user, authenticated data on almost every route, so we use
 * the request-time ("previous model") rendering path rather than Cache
 * Components. See docs/DECISIONS.md (ADR-003).
 */
const securityHeaders = [
  // Content-Security-Policy for pages is set per request (with a nonce) in
  // src/proxy.ts; see src/lib/csp.ts. X-Frame-Options (below) stays for old
  // browsers alongside CSP frame-ancestors 'self'.
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
];

const nextConfig: NextConfig = {
  // Lets several dev servers run side by side (each with its own output folder).
  distDir: process.env.NEXT_DIST_DIR || ".next",
  poweredByHeader: false,
  // Native / WASM packages must not be bundled into server chunks.
  serverExternalPackages: ["@electric-sql/pglite", "pg"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        // Everything except LTI routes refuses cross-origin framing. LTI routes
        // (/lti/*, /api/lti/*) are framed by the LMS; their CSP frame-ancestors
        // carries the LMS allow-list instead, which XFO can't express.
        source: "/:path((?!lti(?:/|$)|api/lti/).*)",
        headers: [{ key: "X-Frame-Options", value: "SAMEORIGIN" }],
      },
      {
        // API responses are data, never documents to render: lock them down.
        // /api/lti/* is excluded because LTI launch responses are small HTML
        // pages posted to by the LMS (inline <style>, possibly an auto-submit
        // form back to the platform).
        source: "/api/:path((?!lti/).*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
          },
        ],
      },
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;
