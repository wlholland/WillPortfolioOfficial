// Tiny progressive enhancements. The site works without this file.
document.documentElement.classList.add("js");

// Reveal on scroll. Robust to fast scrolling and anchor jumps: anything at or
// above the bottom of the viewport is shown (never left hidden).
const pending = new Set(document.querySelectorAll(".reveal"));
function reveal() {
  const limit = innerHeight * 0.94;
  for (const el of pending) {
    if (el.getBoundingClientRect().top < limit) { el.classList.add("in"); pending.delete(el); }
  }
  if (!pending.size) { removeEventListener("scroll", onScroll); removeEventListener("resize", onScroll); }
}
let queued = false;
function onScroll() { if (!queued) { queued = true; requestAnimationFrame(() => { queued = false; reveal(); }); } }
if (matchMedia("(prefers-reduced-motion: reduce)").matches) { pending.forEach((el) => el.classList.add("in")); pending.clear(); }
else { addEventListener("scroll", onScroll, { passive: true }); addEventListener("resize", onScroll); reveal(); }
// Safety net: never leave content hidden (e.g. printing, odd browsers).
addEventListener("beforeprint", () => pending.forEach((el) => el.classList.add("in")));

// Current year in the footer.
document.querySelectorAll("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));

// Offline support: cache the whole site after the first visit (no Wi-Fi needed at the table).
const okOrigin = location.protocol === "https:" || ["localhost", "127.0.0.1"].includes(location.hostname);
if ("serviceWorker" in navigator && okOrigin) navigator.serviceWorker.register("/sw.js").catch(() => {});
