# Family formation trial

## Full-direction revision, 2026-09-21

New opt-in demo: `atlas-webgpu.html?family=1&familyPreview=1&familyArt=production`.
The earlier candidate and original comparison URLs below remain available.
The normal single-character atlas is not replaced by this trial.

`family-production.json` now contains 24 nominal 15-degree headings and four
walking frames per heading for each of PinPin, Mama, and baby Mr. PomPom:
288 body frames on 18 sheets. These poses were generated using the earlier
walking sheets as camera/gait references and the book illustrations as identity
references. Angle labels are requested bins, not measured camera calibration.
All accepted source sheets are 1254 x 1254 pixels. Prompts, generation times,
reviews, source hashes, crop rectangles and foot anchors accompany each sheet
under `images/atlas/family-production-v1/`. Rejected attempts remain documented
in the generation logs and are excluded from the runtime manifest.

Matching closed-eye artwork is separate from the walking sheets. The offline
landmark builder finds candidate eye regions; the browser validates their
registration and feather-band differences before using them. Blinks have an
independent deterministic clock, irregular intervals and occasional doubles.
Invalid or unavailable eye overlays leave the neutral face intact. This is
not yet a complete articulated head/gaze rig: true head yaw, independently
moving silhouettes, and gaze artwork are not implemented. The helper reports
these capabilities separately instead of pretending that the body heading
represents a head turn.

Zoom rendering now uses bounded 1x/2x/4x raster tiers with hysteresis, retaining
the same world sizes and foot anchors. At 4x the three-character packed GPU
texture is 1536 x 512, approximately 3 MiB. Production sheets load on demand
through a nine-entry / 64 MiB decoded-image cache with at most three concurrent
decodes. Current body and eye sheets are pinned, at most six for this renderer;
other entries are evicted by LRU. The separate face cache is capped at 12
frames / 16 MiB. These are application cache budgets, not total browser RAM.
The 18 compressed body sheets together occupy 23,463,046 bytes, but are not
all fetched or decoded on startup. Original full-resolution PNGs are retained
for editing; lossless WebP is used at runtime.

The sections below record the preceding four-view trial, not the new manifest.

### Review and verification

`review/atlas-family-production.html` shows the three animated characters,
all 24 headings, and original/new PinPin at normal and enlarged sizes. Offscreen
preview canvases release their backing stores, and sheets load on demand.

All 12 closed-eye sheets are prepared, but this is not complete expression
coverage. The registration sweep found 19 complete blink frames; visual review
then rejected Mama's four 105-degree overlays for blocky tonal boundaries.
Only 15 remain enabled: PinPin 5, Mama 2, baby 8. Partial pairs are disabled to prevent accidental
winks; the conservative expected-eye count is two for front-oblique views.
Other frames remain neutral. No validated blink changes pixels outside its eye
regions or changes the silhouette alpha. Head yaw and gaze remain unfinished.

`scripts/verify-atlas-production-family.cjs` passed 14 checks across real Chrome
desktop and mobile, including all headings, four gait indices, nonblank source
pixels, zoom invariance, cache budgets, and absence of runtime/load errors.
`scripts/verify-atlas-production-faces.cjs` checks every body frame, records
registration diagnostics, and produces open/closed contact sheets. The original
and candidate gait comparison still passes on desktop and mobile.

Visual caveat: Mama's right-profile near forepaw changes little across the four
frames. Distinct frames and correct heading selection do not certify convincing
foot-contact timing. Keep this trial separate from the default atlas pending
animation and identity review.

Local atlas URL: `atlas-webgpu.html?family=1&familyPreview=1`.
Comparison restoring the earlier black-eyed artwork for PinPin and baby:
`atlas-webgpu.html?family=1&familyPreview=1&pinpinSprite=original&babySprite=original`.
Either sprite parameter can be selected independently. Mama's candidate artwork
is unchanged. PomPom's original-style option is the old PinPin sheet rendered at
baby size, not a previously existing dedicated baby sheet. The two share decoded
images rather than decoding the old six sheets twice.
Without `familyPreview=1`, the normal camera and saved state are retained.
Without `family=1`, the existing single-character atlas remains active.

## Formation

- PinPin leads at the existing 56-world-pixel nominal size.
- Baby Mr. PomPom follows 76 world pixels behind, at size 28.
- Mama follows 162 world pixels behind PinPin, at size 84.
- Separation is measured along the leader's travelled road, including bends.
- Initial placement and chapter-return placement seed the formation from a
  connected route. Retargeting retains the travelled history.
- Gait phases are staggered; heading changes require 140 ms confirmation.
- Gait stride length scales with character size: baby steps twice as often as
  PinPin; Mama steps two-thirds as often, at their shared travel speed.
- All members stop when the leader stops, preserving the stretched formation.

## Rendering and cost

The three existing candidate WebP sheets are loaded once. No image generation
was needed. A fixed 384 x 128 RGBA texture packs three 128 x 128 sprites. This is
192 KiB, compared with the ordinary single sprite's 64 KiB. Bitmap updates are
capped at 20 Hz; position uniforms can update independently. The same world
pass applies each member's own foot-depth occlusion and lens depth, with banner
ordering. There are no three full-screen character canvases or extra lens passes.

History retains about 230 world pixels and is capped at 2048 samples. No path
search or network request is performed per follower per frame. Debug snapshots
are constructed only when explicitly requested through `motion.familyState`.

## Art limitation

These are the first four-view candidate sheets, not complete 360-degree family
artwork. Left-facing poses use mirroring; missing rear-facing views use the
closest available oblique pose. The formation can be reviewed now, but rear views
need additional artwork before a production all-direction rollout.

The original-artwork options retain all 24 old heading bins without mirroring.
The new candidate frames do advance, but the illustrated leg positions sometimes
change very little and expressions change instead. Frame advancement alone is
not proof of a convincing walk. Mama's backwards-looking stride and missing rear
views remain art issues; changing cadence does not certify them as fixed.

## Verification

`node scripts/verify-atlas-family-formation.cjs` exercises real Chrome desktop
and mobile: path following, order, scale, bounded history, pause, and arrival.
The preview was also visually checked at 1280 and 390 CSS pixels, with WebGPU
active and all three characters visible. The normal single-character mode is
kept as the default.

`node scripts/verify-atlas-family-gait.cjs` checks both candidate and restored
variants at 1280 and 390 pixels: all four gait frames advance for all three
members, cadence respects size, pause freezes the texture, intended art sources
are selected, and WebGPU draws three members with no browser errors.
