# Global Miniature Lens

## Rendering Order

The WebGPU atlas composites the painted map, white route dashes, character, cover artwork, ground ring and floating dots into one linear-light color/depth scene. Foreground occlusion is applied before a shared miniature lens effect. Native transparent DOM buttons retain banner input and keyboard accessibility. Canvas2D fallback retains the original visible DOM covers and omits the unsupported effects.

Lens focus follows Mr. PinPin's continuous ground position, not the currently selected story region. The maximum aperture setting, 4, is the new default. Desktop Tab opens the debug panel with bokeh strength, focus offset and highlight controls. Language and preview interactions retain ordinary keyboard behavior; the panel stays hidden on touch devices.

## Depth And Lighting

The old artistic depth pass remains the foreground-occlusion estimate. The lens uses a continuous ground-depth prior, with bounded canopy relief, to avoid treating the entire bright lake as a separate distant slab. The estimated normal pass uses that same calibrated surface. Ground rings use the decoded normal; banner placement searches for a mostly visible position while preserving the authored route clearance.

These are inferred 2.5D surfaces, not recovered geometry. A single SDR painting cannot supply measured scene distances, hidden surfaces, emitter classifications or HDR radiance. The brightness pass shows linear luminance, and the lens uses restrained highlight weighting without pretending white paint is an emitter.

The implementation uses a signed reciprocal-distance circle of confusion, a circular gather and foreground spreading, with linear-light prefiltering to reduce sparse-sample grain. The physical distinction between foreground/background blur and a focus plane follows [NVIDIA's post-process depth-of-field discussion](https://developer.nvidia.com/gpugems/gpugems3/part-iv-image-effects/chapter-28-practical-post-process-depth-field). Our miniature distance range is an artistic calibration, not a measured camera.

## Motion And Provenance

Five scenery frames: the unchanged original plus four built-in image-generator edits, each referencing the original rather than another edit. Full originals, exact prompts and review records live together under `images/atlas/shire-motion-0N-v1.*`. `node scripts/build-atlas-scenery.cjs` produces the compact five-frame sprite sheet and hash manifest.

The atlas downloads the sheet once, uploads its five frames once, and interpolates neighboring frames on the GPU over a 12-second loop. A feathered coverage mask confines motion to water and selected canopy interiors. Static structures retain the original painting. These are crossfades, not optical flow or motion-compensated interpolation. Character gait and neighboring headings also crossfade, with shared foot anchors and at most 20 steady-walking bitmap updates per second.

Reduced-motion or save-data preferences omit scenery downloads. Paused, hidden and preview-covered scenes stop animation work. The scene color target is capped at two million pixels; the expensive lens gather runs at no more than 600,000 pixels.

## Measured Performance

Final Chrome / Apple Metal run at device scale factor 2, desktop 1440 x 1000 and phone-sized 390 x 844. The latter is browser emulation on this Mac, not physical-phone verification.

- Cold payload: 13,176,074 bytes and 77 resource requests. Budget checks pass (under 16 MiB and at most 80 requests).
- Walking: 58.8 fps desktop / 59.9 fps phone-sized; resting animation: 14.9 fps both.
- Paused: zero GPU draws, overlay uploads or script time in the three-second sample.
- Zero new network requests during walking, resting and paused samples.
- Sampled JavaScript heap: approximately 5.2-7.3 MB. This is not total browser-process memory.
- Lens render targets: 25,299,340 bytes desktop / 15,456,288 bytes phone-sized; scenery frames plus mask: 4,202,496 bytes. Original atlas, sprites, depth, banner and other textures are additional.
- Five scenery frames upload only once. The packed sheet is 442,244 bytes and its mask is 11,468 bytes.

Reproduce with `ATLAS_PERF_CHECK=1 PLAYWRIGHT_MODULE=<playwright-path> node scripts/measure-atlas-performance.cjs /tmp/pinpin-global-performance-final.json`. GPU completion probes separately measured median 3.3-4.2 ms / p95 5.4-6.4 ms on this Mac; these are not guarantees for mobile hardware.

Verification includes desktop/mobile screenshots, nonblank canvas pixels, real and synthetic occlusion, bokeh strength ordering, fallback, debug keyboard behavior, normal/calibration tests and bounded sprite interpolation. Crossfades can still show soft double outlines; the single frontmost depth approximation can blend silhouettes imperfectly.

The 36-check global-lens suite passes. Its mobile preview test exposed synchronous dismissal reentry through restored focus and camera movement. Preview dismissal is now idempotent: duplicate close events cause one history traversal, not two. Language-menu checks also pass on both atlas implementations and desktop/touch views.

The 45-check banner surface audit passes. Dense sampled cover visibility at reference placements is 90.9-100% across four locations and three viewport sizes. Visibility is not guaranteed for arbitrary camera clipping. Cached DOM states reduce panning mutations from 5,715 to 2,070 on desktop and 11,040 to zero in the phone-sized sample. Short sampled panning CPU fell from 21.5% to 18.0% desktop and 16.5% to 7.8% phone-sized while retaining about 60 draws per second. These are noisy 1.5-second measurements, not long-duration guarantees.

## Review

`review/atlas-surface-passes.html` shows the original, both depth estimates, normals, brightness, motion mask and all five scenery frames in a flat, scrolling report. All generation prompts and source paths are linked there.
