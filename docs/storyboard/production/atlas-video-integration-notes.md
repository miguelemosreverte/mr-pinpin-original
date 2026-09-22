# Atlas video integration

Date: 2026-09-21. Local integration; not committed or published by this change.
No additional paid generation or upscaling was performed.

## What changed

- The approved 10-second Seedance ping-pong loop replaces the five-frame scenery animation in the WebGPU atlas.
- Offline registration aligns the cropped generated video with the existing map, depth and region coordinates. Original artwork fills the narrow side margins. See [asset measurements](atlas-video-assets-notes.md).
- `atlas-video.json` selects one asset: 1152x768 / 3.63 MB on small or low-memory devices, otherwise 1536x1024 / 7.26 MB. Both run at 24 fps. Neither original video nor old scenery strips are downloaded by this path.
- `atlas-video-source.js` owns decoding and playback lifecycle; `atlas-scenery.js` selects and attaches it. The renderer reuses one GPU texture, uploading only on new decoded frames.
- Video is composed underneath the existing character, routes and covers, then processed by the existing global depth-of-field pipeline. Existing approximate depth occlusion remains in effect.
- Playback and uploads stop when paused, hidden, or suspended behind a book preview. Reduced-motion, data-saving, missing media, blocked autoplay and non-WebGPU cases retain the still map.
- The library now links to the same WebGPU atlas that the reader returns to. No new production controls were added.

## Verification

- Focused source, renderer and camera-return tests: 25 passed, 1 browser-only test skipped in the unit invocation.
- Core camera, focus, occlusion, surface and runtime regression tests: 56 passed, 4 browser-only tests skipped in that invocation.
- Existing global-lens browser verification: all 36 checks passed, including occlusion, bokeh, previews and narrow viewports.
- Runtime browser tests: 5 passed, 1 optional baseline comparison skipped.
- New real-WebGPU integration checks passed at desktop and phone-sized viewports. Verified changing nonblank pixels, one selected video, texture reuse, pause/resume, preview suspension, wheel zoom and static fallback cases. No browser errors.
- `git diff --check` passed.

Reproduce with:

```sh
node --test scripts/atlas-video-source.test.cjs scripts/atlas-video-renderer.test.cjs scripts/atlas-camera-return.test.cjs
node scripts/verify-atlas-video-integration.cjs
node scripts/verify-atlas-global-lens.cjs
ATLAS_RUNTIME_BROWSER=1 node --test scripts/atlas-runtime.test.cjs
ATLAS_PERF_OUTPUT=/tmp/pinpin-runtime-after-video.json node scripts/atlas-runtime-performance.cjs
```

Browser scripts expect the existing local docs server at port 8767.

## Performance sample

Chrome 153 on Apple Metal hardware, approximately three seconds per benchmark phase:

| Viewport width | Animated idle main-thread CPU | Walking CPU | Paused CPU | JS heap range |
| --- | ---: | ---: | ---: | ---: |
| 1440 | 4.13% | 6.53% | 0.04% | 4.80-5.09 MiB |
| 390 | 3.73% | 5.92% | 0.03% | 4.78-5.64 MiB |

Both had zero steady-state network requests and zero draws/uploads while paused. The separate integration probe observed 48 video uploads over approximately two seconds, with no new steady-state texture allocations. Dedicated video texture storage is 6,291,460 bytes desktop and 3,538,948 bytes mobile, excluding decoder buffers and other scene textures.

The continuous camera stress probe used 21.90% desktop / 10.99% phone-sized main-thread CPU. These are short local samples, not battery, GPU utilization or total-process memory measurements. Phone-sized Chrome on a Mac does not replace testing Safari and actual phones. Existing character/path animation can cause additional scene draws between video frames.

## Remaining limits

The approved loop reverses water motion at the turnaround. Generated geometry drift and static side-margin boundaries remain; registration is approximate, and the depth pass is still the original static approximation. The video has not been upscaled, so deep zoom remains limited by its source detail. Local review is available at `http://127.0.0.1:8767/storyboard/atlas-webgpu.html`; GitHub Pages has not been updated by this integration task.
