# Organization site live verification

Canonical public site: https://mr-pinpin.github.io/ .
Official repository: `mr-pinpin/mr-pinpin.github.io`.
Source repository: `mr-pinpin/mr-pinpin-source`.

This lane owns only this report. The existing smoke script is unchanged; no
commits, Git metadata writes, historical-report edits, or release-manifest edits.
Built-in agent continuity was authorized because Mission Control was unavailable.
The main lane reports unchanged immutable release bytes; this is a browser
runtime audit, not a repeat of full archive/hash verification.

## Deployment and command

Observed root HTTP 200 while deployment `35700304196` was finishing.
Workflow: https://github.com/mr-pinpin/mr-pinpin.github.io/actions/runs/35700304196 .
Workflow head: `ae8c3834f82e61267c5fff54b42f507c9d715e63`.
Independently confirmed workflow status `completed`, conclusion `success`, before
starting the browser audit. The main lane also confirmed deployment success.

Run from `/Users/miguel_lemos/anastasia-pinpin-repos/mr-pinpin-source`:

```sh
node scripts/verify-published-site.cjs --base https://mr-pinpin.github.io/ --out /Volumes/TB4/mac-mini-storage/shared/pinpin-organization-live
```

The 33 standard cases cover six Elder routes in English, Spanish, and Russian
at 390x844; chapter 1/2, Timber Tractor, Home Sweet Home, library, atlas, and
Elder navigation at mobile and desktop 1440x1000. Assertions cover scene counts,
first/last image decode and paint, horizontal overflow, actual WebGPU backend,
nonblank canvas pixels, native panning, and language/query-preserving map return.
All screenshots and machine-readable results go to the external SSD directory.

Supplementary legacy-reader checks covered Spanish and Russian at both
viewports so those four readers also received all-language coverage. They were
run using a bounded inline Node/Playwright command with installed Chrome and the
same first/last decode, two-frame paint, scene-count, language, overflow, and
runtime/network assertions. Supplementary assertions also require endpoint
image URLs to use `https://mr-pinpin.github.io/storyboard/`.
No source script was changed. No full asset crawl or eager loading of every scene
was performed.

## Results

PASS: 33/33 standard checks and 16/16 supplementary language checks, both exit 0.

| Run | UTC interval on 2026-09-22 | Duration | Screenshots | Results file |
| --- | --- | --- | --- | --- |
| Existing smoke script | 07:36:44 to 07:37:35 | 51 seconds | 64 | `results.json` |
| Legacy Spanish/Russian supplement | 07:38:27 to 07:38:51 | 24 seconds | 32 | `legacy-languages-results.json` |

Both JSON files and all 96 PNGs are in
`/Volumes/TB4/mac-mini-storage/shared/pinpin-organization-live/`.

- All reader cases passed their scene counts: chapter 1/2 15/16 (plus their
  separate title covers), Timber Tractor 34, Home Sweet Home 21, and Elder
  collection/parts 166/16/21/23/36/70. First/last images decoded and painted;
  no broken completed scene images or horizontal overflow were found.
- Zero unexpected JS exceptions, console errors, HTTP >=400 responses, or
  non-abort transport failures in either run. Standard-run expected noise:
  one origin-root favicon 404 console message and 230 `net::ERR_ABORTED` callbacks.
  Supplement expected noise: the same favicon 404 and 92 aborted callbacks.
  These events remain recorded in the respective JSON files.
- Both atlas views used actual `webgpu`: 6,144 opaque sampled pixels each,
  429 mobile / 502 desktop quantized colors, and native touch/mouse pan changing
  camera position and rendered frames. Canvas bounds were 390x783 mobile and
  1440x939 desktop, starting at y=61.
- Library links and Elder navigation use the organization root, without the old
  project-name prefix. Both viewports completed Lake unlock, Elder collection
  opening, Spanish language switch, and actual map return restoring Elder.
  The reader URL was
  `https://mr-pinpin.github.io/storyboard/index.html?story=one-day-in-the-forest&lang=en&returnTo=atlas-webgpu.html&returnPlace=elder`;
  return URL was
  `https://mr-pinpin.github.io/storyboard/atlas-webgpu.html?lang=es&returnPlace=elder`.

## Screenshot inspection

Visually inspected these artifacts from this deployment:

- `mobile-one-day-in-the-forest-ru-last.png`: final artwork and Russian narrative
  render; controls do not cover the narrative.
- `mobile-library.png` and `desktop-library.png`: covers and controls render;
  desktop labels fit without overlapping.
- `desktop-atlas.png`: nonblank scene artwork and character render across the
  viewport beneath the header.
- `mobile-elder-preview.png`: cover, title, and dismissal control fit inside the
  374x610 preview; desktop preview measured approximately 599x944 and also fits.
- `mobile-elder-return.png`: Spanish map and Elder selection restored. The
  partially clipped cover at the right edge matches the earlier inspected
  original/pages/official baselines; this is existing framing, not a transfer
  regression.
- `supplement-mobile-chapter-2-ru-first.png`: Russian chapter cover renders and
  fits the reader width.
- `supplement-desktop-chapter-1-es-last.png`: final artwork and Spanish narrative
  render with readable controls and no overlap.

No failing checks or blocking organization-transfer regressions were found in
this runtime scope. Only this new report was edited in the checkout. No commits,
code changes, asset modifications, or changes to other lanes' documentation.
