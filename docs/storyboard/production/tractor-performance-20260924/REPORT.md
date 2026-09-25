# Tractor switch performance — 24 September 2026

Final performance, idle-cache, all-24 exact-frame and control checks pass.
Pixel comparisons show tiny one-level differences, detailed below; screenshots
are visually equivalent but are not all bit-identical.

The optimized runtime removes the repeated-stop texture upload hitch while
preserving the existing artwork and source-frame barrier. Total normal-motion
switch duration remains governed by the deliberate camera animation.

| Measurement | Baseline | Final cache-fix build |
| --- | ---: | ---: |
| Warm normal switch maximum RAF gap | 66.7–83.4 ms | 16.8 ms |
| Warm reduced-motion switch mean | 75.0 ms | 34.4 ms |
| Warm normal switch mean, including animation | 1053 ms | 1062 ms |
| Normal switches with a >50 ms long task, out of 6 | 6 | 1, first entry |
| Shader compilations / links across 6 entries | 12 / 6 | 2 / 1 |
| Large panorama uploads across 6 entries | 6 | 3 |
| Hidden orbit uploads across six 60-frame look pans | 360 | 0 |
| Look-pan maximum RAF gap | 16.8 ms | 16.8 ms |

Warm normal switches previously performed three texture uploads totaling
76–80 ms. Final warm switches reuse the full-resolution panorama and update
only the live source video texture, taking 0–0.1 ms in the instrumented WebGL
call. The existing snap durations in this sequence are 374–1046 ms, plus a
minimum 180 ms recenter while the camera is displaced. Those animations were
not shortened. Avoiding a recenter when the camera is already canonical also
helps the idle-and-return case.

Cold upload work still exists: the first final entry has a 50 ms RAF gap and
a 55 ms long task. Prefetch can move loading ahead of a selection; a
zero-byte selection interval does not mean the artwork required no download.
The reduced-motion warm comparison isolates more of the loading/rendering
cost, but includes selector handling, exact frame settlement and browser
scheduling; it is not a pure GPU benchmark.

## Idle cache and memory

With 1.6 seconds quiet at each stop, the sequence
00→06→12→06→00→12 now reuses every repeated demanded panorama: each return
adds zero panorama decodes and zero large texture uploads. The prior rejected
cache policy added one demand upload and about 13 MB of demand image traffic
on every repeat. Normal-motion idle-repeat frame gaps are 16.8, 49.9 and
16.8 ms in this final sample; it is not a claim that all idle switches are
always one frame.

The final cache retains three recently demanded desktop panoramas plus two
neighbor slots. Peak retained panorama allocation observed after idle warmup
is 94,371,840 bytes (90 MiB), five original 3072×1536 RGBA textures. This is
below the desktop 160 MiB limit. Constrained devices use three entries / 96 MiB;
these dimensions require 54 MiB for three. Counts exclude source/orbit video
textures, framebuffers, browser caches and transient decoded images. Decode
concurrency is capped at two; source-lock decoded images are released after
upload. The browser test measures the desktop cap; mobile gesture checks
exercise the constrained setup but are not a mobile memory profiler.

Idle neighbor warming still transfers approximately 24–25 MB when changing
between distant stops. Total completed traffic on the three repeated entry
intervals is 0, 0 and 3.86 MB; image decode/upload counters remain unchanged,
so total network bytes must not be presented as demand-panorama bytes. This
policy trades bounded idle work for fast likely adjacent entries and preserves
recent demand entries instead of letting speculation evict them.

## Quality and controls

The final strict verifier passes all 24 entry and return times against the
manifest and browser-decoded source timestamps within 1e-5 seconds. Selected
cameras match exactly within the existing 1e-8 tolerance, all cubemap links
return HTTP 200, no bridge video is requested, and no page errors occur.
Desktop left-drag orbit/right-drag look and mobile one-finger orbit,
two-finger look, pinch zoom, matched return and width fit all pass.

The runtime still requests the same 3072×1536 panorama PNGs. These are the
full existing runtime backgrounds; separately exported 4K panoramas were not
substituted. Texture filtering, projection, feathering, pixel ratio and shader
artwork math are unchanged. No image resize, compression, blur or regeneration
belongs to this change.

Full-stage entry comparisons cover all 24 stops at 1372×773 pixels. Stop 00
is bit-identical; the others differ in 9–32 pixels, each by one channel level
out of 255, with no larger differences. The strict pixel comparator therefore
records `pass: false` for bit identity; that does not invalidate the separate
exact decoded-frame and camera checks. We do not claim pixel-bit identity.

At fixed yaw +1.2 radians and pitch −0.15 radians, first and repeated views of
stops 00 and 12 after idle neighbor warming differ in 0–12 pixels by at most
one channel level. This covers visible panorama outside the source overlay,
so it would reveal wrong cached artwork or anchor state. Baseline repeated
views are bit-identical, so the tiny before/after differences cannot simply be
attributed to baseline screenshot noise. These are minor rendering differences,
not image resizing, smoothing or changed underlying artwork. The off-axis
harness reports both exact-match flags and an explicit ≤20-pixel, one-level
comparison tolerance. A burst of 100 wheel events changes yaw by 0.3 radians
and produces one panorama draw.

## Reproduction and limitations

Run `measure.cjs final-v2` on the mini with `/opt/homebrew/bin/node`; the script
uses the installed Playwright and Chrome at the recorded paths. Serve the
review mirror on port 18792. `verify-all24.cjs source-all24-performance-v2`,
`compare-off-axis.cjs performance-off-axis-final-v2`, and
`compare-pixels.cjs source-all24-performance-v2` reproduce the other checks.
Use new directory labels for later measurements to preserve these artifacts.

The benchmark uses headless Chrome, viewport 1440×1000, scale 1, ANGLE Metal
on Apple M4. Separate new browser contexts test normal and reduced motion.
The sequence is 00→06→12→00→06→12, with 60 camera RAF steps after each entry.
First entry means cold browser image cache, not cold OS disk cache. An initial
400 ms quiet period allows normal application startup and can allow prefetch.

Image decode promise timing includes fetching/waiting. WebGL measurements
are synchronous JavaScript-call duration, not full GPU execution time.
CDP byte counts cover all completed requests in each interval, including
video and evidence-gallery traffic. RAF and long-task instrumentation is
consistent before/after but changes timing slightly. This is local mini
headless evidence, not a promise of identical frame times on the Air, Safari,
mobile hardware or a slow network. Panning was already about 60 fps on this
GPU; the measurable benefit is fewer switch stalls and redundant uploads.

## Evidence

Source text receipts: `baseline.json`, `optimized.json`, `strict-all24.json`,
`idle-off-axis.json` and `pixel-comparison.json`. SHA-256 hashes in
`optimized.json` bind the final five runtime files to the tested build.

All screenshots and raw event/resource traces remain on mini/TB4 under:
`/Volumes/TB4/mac-mini-storage/shared/pinpin-tractor-stops-20260924/browser-check/`

- `performance-baseline/`: original benchmark results, two raw traces,
  one look screenshot, and the three original runtime JS bodies. Original
  bodies were recovered from Git HEAD and verified against the baseline hashes.
- `performance-final-v2/`: final benchmark results, two raw traces,
  one look screenshot and all five hash-verified final runtime files.
- `source-all24-performance-v2/`: 24 entry screenshots, mobile screenshots,
  strict results, and pixel comparison results.
- `performance-off-axis-final-v2/`: first/repeat off-axis screenshots of
  stops 00 and 12 for both builds, idle-cache transition metrics,
  unchanged-baseline repeat controls, and the wheel burst result.
- `source-all24-v2/`: pre-existing entry reference screenshots; already
  preserved by the earlier exact-source QA archive.

Earlier `performance-optimized`, `performance-optimized-final`,
`source-all24-performance-v1` and `performance-off-axis` directories are
provisional evidence and are excluded from final claims. Profiling caught
speculative upload work during camera movement and neighbor-cache pollution;
both were corrected before the final cache-fix measurements above.
