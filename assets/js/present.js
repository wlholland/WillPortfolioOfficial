// Presenter mode: auto-advancing slides for the career-fair table.
// Keys: ←/→ or space · F full screen · P pause. Tap right/left half to move.
(() => {
  const slides = [...document.querySelectorAll(".slide")];
  const bar = document.getElementById("bar");
  const count = document.getElementById("count");
  const pauseBtn = document.getElementById("pause");
  const DWELL = 10000; // ms per slide
  let i = 0, paused = false, start = performance.now(), elapsed = 0, idleTimer;

  function show(n) {
    i = (n + slides.length) % slides.length;
    slides.forEach((s, k) => s.classList.toggle("on", k === i));
    document.body.classList.toggle("qr-hidden", slides[i].classList.contains("s-intro"));
    count.textContent = `${i + 1} / ${slides.length}`;
    start = performance.now(); elapsed = 0;
  }
  function tick(now) {
    if (!paused) {
      elapsed = now - start;
      bar.style.width = Math.min(100, (elapsed / DWELL) * 100) + "%";
      if (elapsed >= DWELL) show(i + 1);
    }
    requestAnimationFrame(tick);
  }
  function setPaused(p) {
    paused = p;
    pauseBtn.textContent = p ? "Play" : "Pause";
    if (!p) start = performance.now() - elapsed;
  }
  function wake() {
    document.body.classList.remove("idle");
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => document.body.classList.add("idle"), 3000);
  }
  function fullscreen() {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {});
    else document.exitFullscreen?.();
  }

  document.addEventListener("keydown", (e) => {
    wake();
    if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") { e.preventDefault(); show(i + 1); }
    else if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); show(i - 1); }
    else if (e.key.toLowerCase() === "f") fullscreen();
    else if (e.key.toLowerCase() === "p") setPaused(!paused);
    else if (e.key === "Home") show(0);
  });
  document.getElementById("deck").addEventListener("click", (e) => {
    if (e.target.closest("a, button")) return;
    show(e.clientX > innerWidth / 2 ? i + 1 : i - 1);
  });
  pauseBtn.addEventListener("click", () => setPaused(!paused));
  document.getElementById("fs").addEventListener("click", fullscreen);
  ["mousemove", "touchstart"].forEach((ev) => addEventListener(ev, wake, { passive: true }));

  // Keep the screen awake on the table if the browser allows it.
  if ("wakeLock" in navigator) {
    const lock = () => navigator.wakeLock.request("screen").catch(() => {});
    lock();
    document.addEventListener("visibilitychange", () => { if (!document.hidden) lock(); });
  }
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});

  show(0); wake(); requestAnimationFrame(tick);
})();
