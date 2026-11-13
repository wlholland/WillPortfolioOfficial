// Offline support: precache the whole site so it runs with no Wi-Fi (career-fair table).
// Regenerate the list + bump VERSION when files change: node scripts/build-sw.mjs
const VERSION = "wh-202611132047";
const PRECACHE = [
  "/",
  "/assets/css/present.css",
  "/assets/css/site.css",
  "/assets/img/doorway.webp",
  "/assets/img/freeroomfinder.webp",
  "/assets/img/lab-classnotes.webp",
  "/assets/img/lab-library-flashcards.webp",
  "/assets/img/lab-library.webp",
  "/assets/img/lab-minecraft.webp",
  "/assets/img/pmp-goals.webp",
  "/assets/img/pmp-home.webp",
  "/assets/img/pmp-icon.webp",
  "/assets/img/pmp-people.webp",
  "/assets/img/qr-site.svg",
  "/assets/img/vibesec-video.webp",
  "/assets/img/will.webp",
  "/assets/js/present.js",
  "/assets/js/site.js",
  "/favicon.svg",
  "/homelab.html",
  "/index.html",
  "/manifest.webmanifest",
  "/present.html",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  if (req.mode === "navigate") {
    // Pages: fresh when online, cached when not.
    e.respondWith(fetch(req).then((res) => { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); return res; })
      .catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match("/"))));
    return;
  }
  // Assets: cache first, refresh in the background.
  e.respondWith(caches.match(req).then((hit) => {
    const net = fetch(req).then((res) => { if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); } return res; }).catch(() => hit);
    return hit || net;
  }));
});
