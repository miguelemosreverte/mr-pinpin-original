# Published Pages runtime verification

Runtime smoke test: `scripts/verify-published-site.cjs`. No build, deployment,
asset modifications, or Git writes. Mission Control CLI is offline; this bounded
verification lane was assigned directly with the built-in agent fallback.

## Commands

```sh
node scripts/verify-published-site.cjs --base https://miguelemosreverte.github.io/mr-pinpin-original/ --out /Volumes/TB4/mac-mini-storage/shared/pinpin-pages-cutover-original-verified
node scripts/verify-published-site.cjs --base https://miguelemosreverte.github.io/mr-pinpin-pages/ --out /Volumes/TB4/mac-mini-storage/shared/pinpin-pages-cutover-new
```

`--base` accepts the project root or its `storyboard/` directory. `--out` is
required and must be outside the checkout. Use a fresh external SSD directory
for each run. `PLAYWRIGHT_MODULE` overrides module resolution; otherwise the
script tries local Playwright, then the installed npm cache module at
`/Users/miguel_lemos/.npm/_npx/705bc6b22212b352/node_modules/playwright`.
The browser is installed Chrome (`channel: chrome`).

## Scope

- Mobile 390x844: collection and five Elder parts in en/es/ru, with scene counts
  166/16/21/23/36/70. Desktop 1440x1000 and mobile: chapter 1/2, Timber Tractor,
  Home Sweet Home (15/16/34/21), library, and atlas.
  Chapters 1/2 prepend a separate title cover: 16/17 image elements respectively,
  while their narrative scene counts remain 15/16.
- First and last scene images are scrolled into view, decoded, and painted
  before screenshots. Native lazy loading is preserved. No full asset crawl;
  full release hash verification belongs to the publishing lane.
- Reader language/story identity, counts, broken completed images, horizontal
  overflow, library links, actual WebGPU backend, nonblank compositor canvas
  pixels, native mouse/touch pan, Elder lock/unlock and real preview navigation.
- Elder reader language changes to Spanish, then the real map-return link must
  retain the project path, language, and Elder location and restore selection.
- Results JSON records every check, HTTP >=400, JS/console errors, transport
  failures, and screenshots. Failures cause a nonzero exit. Known origin-root
  favicon 404s and navigation-aborted requests remain visible as expected noise.
  No other HTTP, console, or transport failures are allowlisted.

## Runs

Original public site: PASS, 33/33 checks, 2026-09-22 05:56:24 to 05:57:08 UTC
(44 seconds), exit 0. Evidence:
`/Volumes/TB4/mac-mini-storage/shared/pinpin-pages-cutover-original-verified/results.json`.
All 64 PNG screenshots are alongside that JSON on the external SSD.

- Zero page exceptions, console errors, unexpected HTTP >=400 responses, or
  non-abort transport failures. 231 expected-noise events are retained in JSON.
- Mobile/desktop atlas: actual `webgpu`, 6,144 opaque sampled pixels each,
  429/504 quantized colors respectively. Canvas bounds were 390x783 and
  1440x939, starting at y=61. Native pan changed camera and rendered frames.
- Both viewports completed Lake unlock, Elder collection navigation, Spanish
  language switch, and actual map return to the Elder selection.
- Visually inspected the Russian collection's final scene, mobile library,
  desktop atlas, and mobile Elder preview screenshots for artwork and layout.

Initial harness calibration evidence remains in
`/Volumes/TB4/mac-mini-storage/shared/pinpin-pages-cutover-original/`.
Its six failures were assertion assumptions, corrected before the passing run:
the old chapters have separate title covers beyond their 15/16 scenes, and the
Elder preview legitimately uses `storyboard/index.html` instead of the equivalent
directory URL. No application files were changed.

### New public site

PASS, 33/33 checks, 2026-09-22 06:01:11 to 06:02:04 UTC (53 seconds), exit 0.
Target: https://miguelemosreverte.github.io/mr-pinpin-pages/ .
Publishing lane supplied successful deployment `35692850929` and Pages source
commit `6f2c31d`; this audit verifies browser behavior, not release hashes.

Evidence:
`/Volumes/TB4/mac-mini-storage/shared/pinpin-pages-cutover-new/results.json`.
All 64 PNG screenshots are alongside that JSON on the external SSD. The new-base
command above was run unchanged; no smoke-script correction was needed.

- All 18 mobile Elder route/language combinations passed, including first/last
  image decoding and painting, expected scene counts, and no horizontal overflow.
  Legacy chapter 1/2, Timber Tractor, Home Sweet Home, and library passed at both
  viewports. No broken completed scene images were found.
- Zero page exceptions, unexpected console errors, HTTP >=400 responses, or
  non-abort transport failures. Expected noise: one origin-root favicon 404
  console message and 230 `net::ERR_ABORTED` callbacks, all retained in JSON.
- Both atlas views used actual `webgpu`, with 6,144 opaque sampled pixels each
  and 429 mobile / 502 desktop quantized colors. Canvas bounds remained 390x783
  and 1440x939 at y=61. Native touch/mouse pan changed camera and rendered frames.
- Both Elder flows passed Lake unlock, preview, collection reader, Spanish
  language switch, and actual return to the Elder selection. Reader and return
  URLs stayed under `/mr-pinpin-pages/storyboard/`; the returned query was
  `lang=es&returnPlace=elder`.
- Visually inspected `mobile-one-day-in-the-forest-es-first.png`,
  `mobile-one-day-in-the-forest-ru-last.png`, `mobile-library.png`,
  `desktop-library.png`, `desktop-atlas.png`, `mobile-elder-preview.png`, and
  `mobile-elder-return.png`. Artwork renders, reader text fits, and the Elder
  preview remains within the viewport (374x610 mobile, 599x944 desktop).
- The mobile map-return screenshot retains the partially clipped Elder cover
  at the right viewport edge. Direct visual comparison with the original-site
  baseline shows the same framing; this is existing behavior, not a cutover
  regression. The modal preview itself fits fully within the viewport.

No failing checks or blocking cutover regressions found in this runtime scope.
Only this report was edited for the new-site run; no Git writes, publication
changes, or full-asset downloads were performed by this lane.
