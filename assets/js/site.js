// Small progressive enhancements. The site reads fine without this file.
document.documentElement.classList.add("js");
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

// Fade sections in as they scroll into view (robust to fast scrolls/anchor jumps).
const pending = new Set(document.querySelectorAll(".reveal"));
function reveal() {
  const limit = innerHeight * 0.92;
  for (const el of pending) if (el.getBoundingClientRect().top < limit) { el.classList.add("in"); pending.delete(el); }
}
if (reduceMotion) { pending.forEach((el) => el.classList.add("in")); pending.clear(); }
else {
  let queued = false;
  const onScroll = () => { if (!queued) { queued = true; requestAnimationFrame(() => { queued = false; reveal(); }); } };
  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", onScroll);
  reveal();
}
addEventListener("beforeprint", () => pending.forEach((el) => el.classList.add("in")));

document.querySelectorAll("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));

// Hero: a field of thin lines folding like a slow wave, with a faint RGB fringe.
const canvas = document.getElementById("waves");
if (canvas) {
  const ctx = canvas.getContext("2d");
  let w = 0, h = 0, dpr = 1, visible = true, last = 0;
  const LINES = 54;
  function size() {
    dpr = Math.min(devicePixelRatio || 1, 1.5);
    w = canvas.clientWidth; h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function draw(t) {
    ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = "lighter";
    ctx.lineWidth = 0.9;
    const step = Math.max(9, w / 160);
    const passes = [[255, 96, 96, -1.4], [96, 255, 160, 0], [120, 150, 255, 1.4]];
    for (const [r, g, b, shift] of passes) {
      for (let i = 0; i < LINES; i++) {
        const k = i / (LINES - 1);
        const glow = 0.06 + 0.22 * Math.sin(Math.PI * k) ** 1.5; // brighter in the middle of the band
        ctx.strokeStyle = `rgba(${r},${g},${b},${glow.toFixed(3)})`;
        const base = h * (0.16 + k * 0.54);
        ctx.beginPath();
        for (let x = -step; x <= w + step; x += step) {
          const u = x / w;
          const env = 0.55 + 0.45 * Math.sin(u * Math.PI);
          const y = base
            + Math.sin(u * 4.1 + t * 0.00021 + k * 3.1) * h * 0.075 * env
            + Math.sin(u * 9.3 - t * 0.00033 + k * 8.3) * h * 0.022
            + Math.cos(u * 1.7 + t * 0.00011 - k * 2.2) * h * 0.11 * (0.3 + k)
            + Math.sin(k * 12 + t * 0.00017) * h * 0.018
            + shift;
          x === -step ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }
    ctx.globalCompositeOperation = "source-over";
  }
  function loop(t) {
    if (visible && !document.hidden && t - last > 33) { last = t; draw(t); }
    requestAnimationFrame(loop);
  }
  size();
  addEventListener("resize", () => { size(); draw(performance.now()); });
  if ("IntersectionObserver" in window) new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(canvas);
  if (reduceMotion) draw(4000); else requestAnimationFrame(loop);
}

// Offline support: cache the site after the first visit.
const okOrigin = location.protocol === "https:" || ["localhost", "127.0.0.1"].includes(location.hostname);
if ("serviceWorker" in navigator && okOrigin) navigator.serviceWorker.register("/sw.js").catch(() => {});
