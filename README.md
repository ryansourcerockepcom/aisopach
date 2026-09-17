# aisopach.com

The public site for **AIsopach** — the subsurface and land intelligence engine behind the AI Reservoir
program. [Fifth Meridian Energy](https://fifthmeridian.ai) is the investment platform the engine feeds.

The site is a deliberately thin public face: it makes the market case, names what is live today, and sends
qualified readers into a gated access request. Nothing about the method, the training corpus or the basins
under work appears here.

## What's in here

```
index.html            the whole page — one file, semantic HTML
assets/css/site.css   one stylesheet, CSS custom properties, no framework
assets/js/site.js     ~60 lines: mobile nav + the access form
assets/img/           the mark, favicon and app icon (SVG, generated)
CNAME                 aisopach.com — used by GitHub Pages
robots.txt sitemap.xml
docs/DEPLOY.md        GitHub Pages and S3 + CloudFront, step by step
```

No build step, no dependencies, no npm. Open `index.html` in a browser and it renders. To serve it locally
with correct absolute paths:

```bash
python3 -m http.server 8080    # then open http://localhost:8080
```

## Brand

| | |
|---|---|
| Mark | Benzene ring with one lit atom (`assets/img/mark.svg`) |
| Wordmark | **Doto** 900, `AI` in phosphor green, `sopach` in near-white |
| Accent | Phosphor green `#34E27A` |
| Ground | Near-black `#04090A`, panels `#0A1416`, raised `#0F1E21` |
| Body / display | IBM Plex Sans 300–500 / Space Grotesk 600 |
| Numerals & labels | Doto 900 and IBM Plex Mono — the instrument-readout voice |

All colours live as custom properties in `:root` at the top of `site.css`. Fonts come from Google Fonts; to
self-host them later, drop the woff2 files in `assets/fonts/` and swap the `<link>` for `@font-face` rules.

The data visuals (isopach contours, log strip, chain of title, charts) are **inline SVG generated from
code**, not images — they scale, theme with the palette and cost nothing to load.

## Before this goes live

1. **Numbers in the E-03 card** — 24-hour runsheet turnaround and a 70% land-acquisition cost reduction — are
   claims about the live suite. Keep them current.
2. **Wire the form.** Out of the box the access form opens a prefilled mail draft to
   `access@aisopach.com` (set via `data-fallback-email` on the `<form>`). To capture submissions properly,
   set an endpoint before `site.js` loads:

   ```html
   <script>window.AISOPACH_ACCESS_ENDPOINT = "https://api.aisopach.com/access";</script>
   ```

   Any endpoint that accepts `POST` with a JSON body works — API Gateway + Lambda, a Formspree/Basin form
   endpoint, or a route on the Fifth Meridian platform.
3. **Check the mailbox** in `data-fallback-email` exists and is monitored — the page promises a 48-hour reply.
4. **Add an OG image.** `og:image` is intentionally absent; a 1200×630 PNG at `assets/img/og.png` plus one
   meta tag completes the social card.

## Sources

Every figure on the page is sourced in the footer. They are public, current as of September 2026, and worth
re-checking annually:

- 4.85M US wells drilled — Visualizing Energy, August 2023
- 624 / 434 / 137 billion barrels — McConnell & Li, University of Houston, September 2026
- ~770,000 marginal wells — EIA / IOGCC, via SPE *JPT*
- $500B upstream AI value, $25B→$35B annual spend — Rystad Energy, May 2026
- $500–650/day landman, $5B/yr ownership errors, 75% faster title — Enverus

## Deployment

See [`docs/DEPLOY.md`](docs/DEPLOY.md). Short version: push to `main` and the included GitHub Actions
workflow publishes to GitHub Pages, with `CNAME` pointing at `aisopach.com`. The same files drop into an S3
bucket behind CloudFront if you'd rather keep it on AWS beside the Fifth Meridian platform.

---

© 2026 AIsopach. Nothing in this repository is an offer to sell or a solicitation of an offer to buy any
security.
