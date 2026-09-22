# Atlas performance pass

Measured locally on 2026-09-20. No publication or approval metadata changes.

## Before and after

Installed Chrome, Apple Metal WebGPU, fresh browser contexts, 390x844 and
1440x1000 viewports at DPR 2. Three-second steady-state samples. Network values
are resource body bytes from the local static server, not GitHub CDN measurements.

| Cost | Before | After |
| --- | ---: | ---: |
| Cold atlas resource bodies | 31,535,867 bytes | 12,530,617 bytes |
| Resource requests | 94 | 67 |
| Resting map draws/uploads per second | 60 | about 15 |
| Walking draws per second | 60 | 60 |
| Paused draws/uploads per second | 0 | 0 |
| Phone-size resting main-thread task time, 3 seconds | 159 ms | 55 ms |
| Confidence-field body | 3,145,728 bytes | 78,294 bytes |
| Retained CPU depth lookup | 6 MiB RGBA | 1.5 MiB red channel |

The separate miniature measurements at desktop DPR 1 / phone DPR 3 were
10,955,007 bytes before and 226,366 / 686,672 bytes after. Selected decoded
miniature pixel storage falls from 24 MiB to 1.5 / 6 MiB. These are pixel-buffer
sizes, not total browser RAM. The four-slice GPU bokeh cache remains bounded at
24 MiB; its appearance and resolution are unchanged.

CPU timings are indicative samples on a shared Mac, not phone battery or total
GPU power measurements. Local cold readiness was 351-372 ms before and 477-540 ms
after in the initial after run, and 476-516 ms in the final run: lower transferred
bytes do not imply faster decoding on localhost. The
after resting sample waits three seconds for depth easing to settle; the original
sample waited 1.5 seconds. JS heap is recorded but is not a total RAM measurement.

## Implementation

- Lossless WebP runtime derivatives for map, depth, border and sprite sheets;
  original PNG artwork and provenance remain intact. Native RGBA is identical.
  Chrome's ordinary sprite Image decode can differ by 1/255 after compositing
  because of alpha rounding; this is not an artwork alteration.
- The fallback sprite sheet loads only for absent or failed directions, saving
  another 714,846 transfer bytes and about 6 MiB of decoded pixels on healthy
  startup. Pending directional decoding does not trigger an unnecessary fallback.
- Responsive miniature WebPs at 256, 512 and 1024 pixels wide, q92. These are
  deliberately lossy, visually reviewed at ordinary and maximum banner sizes.
  Zoom upgrades capacity; panning and language changes reuse existing images.
- Story resolution shares in-flight/successful results; failed results can retry.
  Full localized title images remain lazy. The existing completeness HEAD checks
  remain, but no longer repeat for every caller or language change.
- The confidence field transfers as gzip, validates once and retains one 3 MiB
  lookup buffer. Raw and mask-compilation fallbacks remain available. Sampling
  and the existing 160 ms confidence-gated selection debounce are unchanged.
- Motion explicitly invalidates changed pixels. No attribute-observer render
  loop, no repeated unchanged dataset writes, cached GPU views/bind groups, and
  no motion texture upload for camera-only frames. Walking/panning retain display
  cadence; resting animated trails use 15 Hz. Hidden/preview states suspend work.
- The CPU depth sampler retains only its used channel and releases its scratch
  canvas; 1,004 sampled points match the previous interpolation exactly.

## Regression checks

Set `PLAYWRIGHT_MODULE` to an installed Playwright module and serve `docs` on
localhost:8767. No build or external network service is required by the atlas.

```sh
ATLAS_PERF_CHECK=1 node scripts/measure-atlas-performance.cjs /tmp/pinpin-performance.json
node --test scripts/atlas-focus.test.cjs scripts/atlas-cover-selection.test.cjs scripts/atlas-miniatures.test.cjs scripts/atlas-depth.test.cjs
ATLAS_BANNERS_READY=1 node scripts/verify-atlas-banners.cjs
node scripts/verify-atlas-language-menu.cjs
ATLAS_RUNTIME_BROWSER=1 node --test scripts/atlas-runtime.test.cjs
node scripts/build-atlas-focus-field.cjs --check
node scripts/build-atlas-web-assets.cjs --check
```

The performance check guards a 16 MiB cold body budget, at most 80 requests,
resting GPU cadence below 20 Hz, active walking, zero paused GPU work, compressed
field delivery, and zero background requests during measured steady phases.
The 113-flow banner suite verifies desktop/phone layouts, visible canvas pixels,
native touch pan/pinch, all languages, approval gates and two-tap reader navigation.
The language suite verifies both atlas implementations with two tabs and mouse/touch.
The runtime browser suite checks hidden/preview suspension, return lifecycle,
same-frame coalescing and fallback loading. Saved-baseline motion pixel comparisons
also passed in the runtime lane; they require its separate baseline fixture.

Rebuild image derivatives with `build-atlas-web-assets.cjs` and
`build-atlas-miniatures.cjs`; their metadata records source hashes and encoding.
Web asset rebuilds require cwebp/dwebp/ImageMagick; miniature builds require
cwebp/ImageMagick. Confidence-field rebuilds use Node and Playwright.
