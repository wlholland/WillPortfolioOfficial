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

// ---------------------------------------------------------------------------
// Hero: a field of thin lines folding like a slow wave.
// With WebGL, the lines are drawn offscreen and a shader bends them:
// ripples follow the cursor, clicks/taps send out a shockwave, a few slow
// swells drift on their own (so phones see motion too), with a faint RGB
// fringe and amber glow where the field is disturbed. Without WebGL, or with
// reduced motion, the plain lines are drawn straight to the canvas.
// ---------------------------------------------------------------------------
const LINES = 54;
const PASSES = [[255, 96, 96, -1.4], [96, 255, 160, 0], [120, 150, 255, 1.4]];

function drawWaves(ctx, w, h, t) {
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = "lighter";
  ctx.lineWidth = 0.9;
  const step = Math.max(9, w / 160);
  for (const [r, g, b, shift] of PASSES) {
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

const VERT = `
attribute vec2 p;
varying vec2 v;
void main() { v = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }`;

const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 v;
uniform sampler2D uLines;  // the wave lines, redrawn ~30x a second
uniform vec2 uRes;         // canvas size in device pixels
uniform float uTime;       // seconds
uniform vec2 uPointer;     // smoothed pointer, 0..1, y up
uniform vec2 uTilt;        // slower pointer offset for parallax
uniform float uHover;      // 0..1, eases in/out as the pointer enters/leaves
uniform vec3 uTaps[6];     // x, y, start time of recent clicks/taps
uniform vec3 uGlow;

void main() {
  vec2 aspect = vec2(uRes.x / uRes.y, 1.0);

  // Ripples rolling outward from the pointer.
  vec2 fromPtr = (v - uPointer) * aspect;
  float dist = length(fromPtr);
  vec2 outward = fromPtr / (dist + 1e-4);
  float nearPtr = smoothstep(0.0, 0.05, dist);  // no pinhole right under the cursor
  vec2 bend = outward * sin(dist * 24.0 - uTime * 3.6) * exp(-dist * 3.2) * 0.026 * uHover * nearPtr;
  bend -= fromPtr * exp(-dist * dist * 12.0) * 0.22 * uHover;  // lens: lines swell and part around the pointer

  // A ripple for each recent click. Not a perfect circle: the front wobbles with
  // direction (a different shape per click), travels faster some ways than
  // others, is stronger on some sides, and trails a few smaller crests, moving
  // the lines mostly up and down so it runs *through* them like water.
  float ring = 0.0;
  for (int i = 0; i < 6; i++) {
    float age = uTime - uTaps[i].z;
    if (age >= 0.0 && age < 3.0) {
      vec2 c = (v - uTaps[i].xy) * aspect;
      float r = length(c);
      float ang = atan(c.y, c.x);
      float seed = fract(sin(dot(uTaps[i].xy, vec2(127.1, 311.7))) * 43758.5453) * 6.2831;
      float wob = 0.10 * sin(ang * 3.0 + seed) + 0.06 * sin(ang * 5.0 - seed * 1.7 + age * 1.5)
                + 0.04 * sin(ang * 8.0 + seed * 2.3);
      float d = r - age * 0.72 * (1.0 + wob);                         // >0 ahead of the front, <0 behind
      float env = exp(-max(d, 0.0) * 30.0) * exp(min(d, 0.0) * 6.0);  // sharp front, longer tail
      float amp = (0.55 + 0.45 * sin(ang * 2.0 + seed * 1.3 + age)) * exp(-age * 1.3) * smoothstep(0.0, 0.04, r);
      float wave = sin(d * 42.0) * env * amp;
      bend += vec2(0.25 * c.x / (r + 1e-4), 1.0) * wave * 0.032;
      ring += abs(wave);
    }
  }

  // Three soft swells that wander on their own.
  for (int i = 0; i < 3; i++) {
    float f = float(i);
    vec2 o = vec2(0.5 + 0.34 * sin(uTime * (0.07 + 0.02 * f) + f * 2.4),
                  0.5 + 0.30 * cos(uTime * (0.05 + 0.015 * f) + f * 1.3));
    vec2 c = (v - o) * aspect;
    float r = length(c);
    bend += c / (r + 1e-4) * sin(r * 8.0 - uTime * 1.1) * exp(-r * 2.5) * 0.0035;
  }

  vec2 uv = v - uTilt * 0.025 + bend;
  float energy = length(bend);
  vec2 dir = energy > 1e-5 ? bend / energy : outward;
  float split = 0.0006 + energy * 0.4;   // RGB fringe grows where the field is bent
  vec3 col = vec3(texture2D(uLines, uv + dir * split).r,
                  texture2D(uLines, uv).g,
                  texture2D(uLines, uv - dir * split).b);
  col += uGlow * (energy * 1.4 + ring * 0.05 + exp(-dist * 9.0) * 0.025 * uHover);
  col += (fract(sin(dot(v * uRes + uTime, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) * 0.03; // grain
  gl_FragColor = vec4(col, 1.0);
}`;

function makeShader(gl) {
  const compile = (type, src) => {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src); gl.compileShader(sh);
    return gl.getShaderParameter(sh, gl.COMPILE_STATUS) ? sh : null;
  };
  const vs = compile(gl.VERTEX_SHADER, VERT), fs = compile(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return null;
  const prog = gl.createProgram();
  gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
  gl.useProgram(prog);

  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW); // one big triangle
  const p = gl.getAttribLocation(prog, "p");
  gl.enableVertexAttribArray(p);
  gl.vertexAttribPointer(p, 2, gl.FLOAT, false, 0, 0);

  gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

  const u = {};
  for (const name of ["uRes", "uTime", "uPointer", "uTilt", "uHover", "uTaps", "uGlow"]) u[name] = gl.getUniformLocation(prog, name);
  gl.uniform3f(u.uGlow, 1.0, 0.675, 0.18); // #ffac2e
  return u;
}

function runShaderHero(canvas, gl, u, isVisible) {
  const lines = document.createElement("canvas");
  const lctx = lines.getContext("2d");
  let w = 0, h = 0;
  function size() {
    const dpr = Math.min(devicePixelRatio || 1, 1.75);
    w = canvas.clientWidth; h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    const s = Math.min(dpr, 1.25); // the lines texture doesn't need full resolution
    lines.width = Math.round(w * s); lines.height = Math.round(h * s);
    lctx.setTransform(s, 0, 0, s, 0, 0);
    gl.uniform2f(u.uRes, canvas.width, canvas.height);
    texAt = -1;
  }

  // Pointer state. Targets jump; the shader sees smoothed values.
  const ptr = { tx: 0.5, ty: 0.5, x: 0.5, y: 0.5, tiltX: 0, tiltY: 0, inside: 0, hover: 0 };
  const taps = new Float32Array(18).fill(-100);
  let tapIndex = 0, time = 0;
  const host = canvas.parentElement;
  const at = (e) => {
    const r = canvas.getBoundingClientRect();
    return [(e.clientX - r.left) / r.width, 1 - (e.clientY - r.top) / r.height];
  };
  host.addEventListener("pointermove", (e) => { [ptr.tx, ptr.ty] = at(e); ptr.inside = 1; }, { passive: true });
  host.addEventListener("pointerleave", () => { ptr.inside = 0; });
  host.addEventListener("pointerdown", (e) => {
    const [x, y] = at(e);
    ptr.tx = x; ptr.ty = y; ptr.inside = 1;
    if (e.pointerType !== "mouse") { ptr.x = x; ptr.y = y; } // fingers don't glide in from the last spot
    taps.set([x, y, time], tapIndex * 3);
    tapIndex = (tapIndex + 1) % 6;
  }, { passive: true });
  const lift = (e) => { if (e.pointerType !== "mouse") ptr.inside = 0; };
  host.addEventListener("pointerup", lift);
  host.addEventListener("pointercancel", lift);

  let lost = false;
  canvas.addEventListener("webglcontextlost", (e) => { e.preventDefault(); lost = true; });

  let last = performance.now(), texAt = -1;
  function frame(now) {
    requestAnimationFrame(frame);
    if (lost || !isVisible() || document.hidden) { last = now; return; }
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now; time += dt;

    const follow = 1 - Math.exp(-dt * 10), drift = 1 - Math.exp(-dt * 2.5), fade = 1 - Math.exp(-dt * 3);
    ptr.x += (ptr.tx - ptr.x) * follow;
    ptr.y += (ptr.ty - ptr.y) * follow;
    ptr.tiltX += ((ptr.tx - 0.5) * ptr.inside - ptr.tiltX) * drift;
    ptr.tiltY += ((ptr.ty - 0.5) * ptr.inside - ptr.tiltY) * drift;
    ptr.hover += (ptr.inside - ptr.hover) * fade;

    if (texAt < 0 || now - texAt > 33) { // redraw the lines at ~30 fps; the shader runs every frame
      texAt = now;
      drawWaves(lctx, w, h, now);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, lines);
    }
    gl.uniform1f(u.uTime, time);
    gl.uniform2f(u.uPointer, ptr.x, ptr.y);
    gl.uniform2f(u.uTilt, ptr.tiltX, ptr.tiltY);
    gl.uniform1f(u.uHover, ptr.hover);
    gl.uniform3fv(u.uTaps, taps);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  size();
  addEventListener("resize", size);
  requestAnimationFrame(frame);
}

function runPlainHero(canvas, isVisible) {
  const ctx = canvas.getContext("2d");
  let w = 0, h = 0, last = 0;
  function size() {
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    w = canvas.clientWidth; h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  size();
  addEventListener("resize", () => { size(); drawWaves(ctx, w, h, reduceMotion ? 4000 : performance.now()); });
  if (reduceMotion) { drawWaves(ctx, w, h, 4000); return; }
  (function loop(t) {
    if (isVisible() && !document.hidden && t - last > 33) { last = t; drawWaves(ctx, w, h, t); }
    requestAnimationFrame(loop);
  })(0);
}

let heroCanvas = document.getElementById("waves");
if (heroCanvas) {
  const gl = reduceMotion ? null : heroCanvas.getContext("webgl", { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: "low-power" });
  const uniforms = gl && makeShader(gl);
  if (gl && !uniforms) { const fresh = heroCanvas.cloneNode(); heroCanvas.replaceWith(fresh); heroCanvas = fresh; } // WebGL half-worked: start over in 2D
  let visible = true;
  if ("IntersectionObserver" in window) new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(heroCanvas);
  if (uniforms) runShaderHero(heroCanvas, gl, uniforms, () => visible);
  else runPlainHero(heroCanvas, () => visible);
}

// Offline support: cache the site after the first visit.
const okOrigin = location.protocol === "https:" || ["localhost", "127.0.0.1"].includes(location.hostname);
if ("serviceWorker" in navigator && okOrigin) navigator.serviceWorker.register("/sw.js").catch(() => {});
