# Generated panorama entry bridges

**Current status: generation held after user review.** The user rejected visible tractor movement in the pilot. The earlier preview acceptance below is superseded by this feedback. The existing demo is preserved for comparison; no further requests or retries are allowed until the endpoint/prompt decision. Two requests completed before the hold (04 and13);13 is preserved but not enabled. The watcher was terminated and no bridge processes remain.

The accepted stop-04 pilot uses one generated transition from the exact orbit frame at 4 seconds into the exact canonical panorama opening. The browser plays that clip forward on entry and a local reverse on exit. It is not a CSS crossfade. Other stops remain unavailable until their reviewed descriptors and actual bridge files exist.

## Pilot result

- One PixVerse V6 transition request; requested 1 second, returned 25 frames at 24 fps (1.041667 seconds), 1280×720, silent.
- Parent reviewed five actual decoded frames and accepted this as a preview. The machine remains broadly coherent; textures and fine wheel details change slightly.
- Decoded start versus supplied source: mean absolute RGB error 4.09/255, p95 11. End versus supplied panorama opening: mean 5.58/255, p95 16. The endpoints are close, not pixel-identical.
- The forward and reverse derivatives encode the same decoded frame sequence in opposite orders with all frames independently seekable. No endpoint substitution, dissolving, or added imagery.
- Canonical source and panorama are shown before and after the clip. The source orbit and panorama assets are untouched.

## Interaction verification

Actual Chromium checks on the mini passed: forward entry, canonical opening camera, fresh wheel look, smooth recenter then reverse return to exactly the 4-second orbit anchor, mid-entry cancellation, repeated entry, queued left drag after return, reduced-motion direct switching, and native two-touch entry at 390 px. No page errors. The entering gesture is discarded, including its pitch; the next gesture controls head look.

Evidence: `browser-check/bridge/results.json`, `pilot-look.png`, `pilot-mobile.png`; reproducible script `bridge-tools/verify-bridge.cjs`. The actual video contact sheet is `stops/stop-04/bridge/check/contact-sheet.png` on the mini. These are local review artifacts, not a public deployment.

## Cost and submission boundary

Official [PixVerse V6 transition schema](https://fal.ai/models/fal-ai/pixverse/v6/transition/api) permits 1–15 seconds. The [720p silent tier](https://fal.ai/models/fal-ai/pixverse/v6/transition) is $0.045 per second when checked on 2026-09-24: estimated $0.045 for the pilot and $1.08 for all 24 one-second requests. These are estimates, not invoices. Reverse encoding has no second generation call.

One paid request per reviewed stop is authorized. Durable submission locks prevent automatic paid retries; collecting an existing request never resubmits it. Operational receipts containing upload URLs remain on the mini. Source records contain only hashes, request identifiers, static settings, and sanitized provenance.

## Remaining scope

Only stop 04 was ready at the initial browser pass. As the other selected panoramas arrive, submit their bridges once, inspect actual start/middle/end contact sheets, and run every ready entry camera / reverse-return anchor. Do not interpret the 24 extracted source frames as 24 finished panorama transitions.

## Motion follow-up

The original prompt explicitly allowed camera settling. Manually seeded wheel-hub tracking over the actual25 decoded frames shows a midpoint front-wheel shift of (−16.3,−6.3) pixels and rear-trailer-wheel shift of (+13.5,−0.4) pixels at1280×720. Their horizontal separation therefore expands about29.8 pixels before settling again. These are image-space optical-flow estimates, not exact physical wheel centers. Full samples are preserved in `stops/stop-04/bridge/wheel-motion.json`. A locked camera/locked machine prompt is being drafted; differing endpoint geometry must be resolved first.

## Separately authorized locked-camera retry

A single new stop-04 pilot used the closer strict-outpaint endpoint and an explicit locked-camera / locked-machine prompt. It also failed: maximum outer-wheel-hub span overshoot rose from 27.07 px to 38.51 px. See [the measured comparison and exact prompt](stops/stop-04/bridge-static-v2/REVIEW.md). No further requests are authorized or running; bulk remains held. Total paid requests: three (original04, original13, revised04). The revised clip is not integrated into the main UI.
