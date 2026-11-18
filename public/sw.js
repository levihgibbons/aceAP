/*
 * AceAP service worker — deliberately conservative.
 *
 * Caches ONLY: the offline fallback response (generated here) and the static
 * app icons. It never caches API responses, authenticated HTML, or anything
 * under /api/, so no student record is stored on the device by this worker.
 *
 * Navigations go network-first; if the network fails, the offline page is
 * shown. Answers, notes and other submissions cannot be made offline — the
 * page says so. Old caches are removed when a new version activates.
 */
const VERSION = "aceap-sw-v1";
const STATIC_ASSETS = ["/icons/icon.svg", "/icons/maskable.svg"];

const OFFLINE_HTML = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline · AceAP</title>
<style>:root{color-scheme:light dark}body{margin:0;min-height:100vh;display:grid;place-items:center;font:16px/1.6 system-ui,sans-serif;background:#f6f5f1;color:#1c1b18}
@media (prefers-color-scheme:dark){body{background:#121315;color:#edecea}}main{max-width:28rem;padding:2rem}h1{font-size:1.5rem;margin:0 0 .5rem}button{margin-top:1rem;font:inherit;padding:.6rem 1rem;border-radius:.6rem;border:1px solid currentColor;background:transparent;color:inherit;cursor:pointer}</style></head>
<body><main><h1>You're offline</h1><p>AceAP needs a connection to load lessons and to save answers, notes and progress. Nothing you submit can be recorded until you're back online.</p><button onclick="location.reload()">Try again</button></main></body></html>`;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) =>
        Promise.all([
          cache.addAll(STATIC_ASSETS),
          cache.put("/__offline", new Response(OFFLINE_HTML, { headers: { "Content-Type": "text/html; charset=utf-8" } })),
        ]),
      )
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  if (req.mode === "navigate") {
    // Network-first; the response is NOT cached (it may contain student data).
    event.respondWith(fetch(req).catch(() => caches.match("/__offline")));
    return;
  }
  if (STATIC_ASSETS.includes(url.pathname)) {
    event.respondWith(caches.match(req).then((hit) => hit || fetch(req)));
  }
});
