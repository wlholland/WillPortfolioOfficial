# willholland.dev

Will Holland's portfolio. Static HTML/CSS/JS, no build step, deployed on
**Railway**: every push to `main` redeploys (`npm start` → `npx serve .`,
headers in `serve.json`).

| Path | What |
|---|---|
| `index.html` | Main portfolio (AI approach, work, consulting case studies, experience, skills) |
| `homelab.html` | Homelab: screenshots + stacks of the self-hosted tools |
| `present.html` | **Presenter mode** for the career-fair table: full-screen slides, auto-advance, ←/→, F = full screen, P = pause, QR to the site |
| `assets/css`, `assets/js` | Styles and small progressive-enhancement scripts |
| `assets/img` | WebP images (keep each under ~70 KB), QR codes, Open Graph image |
| `sw.js` | Service worker: precaches the whole site so it works **offline** after one visit |
| `scripts/build-sw.mjs` | Regenerates the precache list + version in `sw.js` |

## Changing the site

1. Edit the HTML/CSS. New images: WebP, ~1400px wide max.
2. `node scripts/build-sw.mjs` (so offline visitors get the new files).
3. Preview: `python3 -m http.server 8000` and open http://localhost:8000.
4. Commit and push to `main` (Railway redeploys in a minute or two).

## Before presenting offline

Open https://willholland.dev and https://willholland.dev/present.html once on
the laptop/phone while online. The service worker caches everything, and both
then work in airplane mode.
