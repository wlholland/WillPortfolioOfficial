// Offline support: precache the whole site so it runs with no Wi-Fi (career-fair table).
// Regenerate the list + bump VERSION when files change: node scripts/build-sw.mjs
const VERSION = "wh-202611190127";
const PRECACHE = [
  "/",
  "/assets/css/present.css",
  "/assets/css/site.css",
  "/assets/fonts/inter-latin.woff2",
  "/assets/img/doorway.webp",
  "/assets/img/freeroomfinder.webp",
  "/assets/img/lab-classnotes.webp",
  "/assets/img/lab-library-flashcards.webp",
  "/assets/img/lab-minecraft.webp",
  "/assets/img/pmp-hero.webp",
  "/assets/img/qr-doorway.svg",
  "/assets/img/qr-frf.svg",
  "/assets/img/qr-homelab.svg",
  "/assets/img/qr-pmp.svg",
  "/assets/img/qr-site.svg",
  "/assets/img/qr-vibesec.svg",
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
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return;
  const put = (res) => { if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); } return res; };
  // Images + fonts rarely change: cache first.
  if (/\.(webp|png|svg|woff2)$/.test(url.pathname)) {
    e.respondWith(caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req).then(put)));
    return;
  }
  // Pages, CSS, JS: always fresh when online; cached copy only when offline.
  e.respondWith(fetch(req).then(put).catch(() =>
    caches.match(req, { ignoreSearch: true }).then((hit) => hit || (req.mode === "navigate" ? caches.match("/") : Response.error()))));
});
