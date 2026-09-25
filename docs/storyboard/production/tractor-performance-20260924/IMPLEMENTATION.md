# Tractor runtime performance changes

Scope: `tractor-tour.js`, `tractor-tour-video.js`,
`tractor-panorama-anchor.js`, new `tractor-tour-cache.js`, and the tour HTML
module cache version. Shared home panorama code and all artwork are unchanged.

- Reuse the source-lock WebGL program, buffer, and source texture across stops.
  Existing shader code, projection uniforms, source feather, texture filtering,
  display pixel ratio, and full-resolution PNG inputs are retained.
- Cache full-resolution panorama GPU textures with recency-based eviction and
  the visible texture pinned. Protect the three latest demanded desktop stops
  (one on constrained devices), reserving two slots for the currently requested
  adjacent pair. Speculative uploads evict obsolete neighbors/older visits;
  they cannot evict the protected demand history or either current neighbor.
  Demand cache hits refresh visit recency. Eviction happens before allocation. Devices reporting more
  than 4 GiB memory with a non-coarse pointer permit 5 entries / 160 MiB;
  other devices, including unknown memory, permit 3 entries / 96 MiB.
  Actual selected panoramas are all 3072×1536, 18 MiB RGBA each: retained
  panorama texture peaks are therefore 90 MiB or 54 MiB respectively.
  These figures exclude the source/video textures, drawing buffers, decoder,
  browser HTTP cache, and transient decoded images.
- Decode at most two images concurrently across explicit requests and warmup.
  Source-lock decoded images are released after upload; ordinary panorama mode
  retains at most four decoded images. Failed requests can retry.
- Warm the nearest and two adjacent stops sequentially while the video is
  paused, no seek is queued, no pointer is held, and input has been quiet for
  200 ms. Recheck that condition before GPU upload. A changed request cancels
  obsolete speculative work. No panorama resizing or alternate artwork is used.
- Do not load a raw source PNG for source-lock entry. The live paused video
  supplies the source texture only after the existing `settleStopFrame` barrier,
  including the exact `<1e-5` RVFC media-time check. Evidence links remain.
- Reuse video texture storage with `texSubImage2D` after dimensions are known.
  Skip orbit uploads while its canvas is covered by the panorama, and skip
  duplicate frame uploads. Resizing can repaint the retained frame.
- Coalesce input-driven panorama paints into one animation-frame callback.
  The debugging `setCamera` API still paints synchronously.
- Skip the former 180 ms minimum recenter delay only when yaw, pitch, and FOV
  are already canonical (difference below 1e-10). Actual recenter motion and
  snap animation timings are unchanged.
- Context loss cancels speculative work and clears renderer/image references.
  `setEnabled` and `readPixels` renderer APIs remain available.

Validation performed by implementation lane: Node syntax checks for all four
JavaScript files; isolated cache checks for two-job concurrency, request
deduplication, bounded retention, failed-request retry, and transient decoding.
Mock-WebGL cache checks additionally cover idle three-stop revisit protection,
demand-hit recency updates, current-neighbor availability, constrained-device
three-texture bounds, peak retained bytes, and renderer cleanup.
Profiler lane owns browser performance, desktop/mobile behavior, all-24 exact
source-frame checks, and unchanged-artwork pixel comparisons. See `REPORT.md`.

`window.tractorTour.snapshot.performance` exposes image decode counts, current
and peak retained panorama bytes, upload counts, entry limits, and orbit
upload/draw counts for reproducible measurement.
