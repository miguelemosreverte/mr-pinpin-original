# Source-frame projection in the tractor tour

The optional `tractor-tour.html?sourceLock=1&stop=stop-04&mode=look` trial uses the same orbit/look controls. The original default remains available for comparison. Only descriptors explicitly marked reviewed or experimental for sourceLock enable source projection; extracted source frames alone do not enable a viewpoint.

The initial integration uses the accepted stop-04 assembled V4 panorama with its rear repair, and registers the source frame at the selected yaw, pitch and vertical FOV, with 16:9 aspect and .94→1 rectangular feather. It does not use the unrepaired new outpaint. Both rejected generated bridges are bypassed. On exit, the view first recenters to the canonical tractor-facing camera, then returns to the same orbit timestamp before resuming a queued drag.

## First integration checks

Actual Chromium at desktop 1440 px and mobile 390 px passed direct entry, bridge bypass, canonical reentry, recenter-before-return and same 4-second anchor. No page errors or horizontal overflow. Captures are under `browser-check/static-integration/`: orbit/entry pairs and ±30°/±60° boundary views.

The tractor geometry is preserved at entry. The first PNG-based integration exposed a display-color difference: the original ffmpeg PNG looks darker/more saturated than the browser video. This is not described as a pixel-identical transition. Parent requested using the actual paused browser video frame as the runtime texture; that update and its measurement follow below.

Turning 30° or 60° still reveals a visible scenery join near the registered source rectangle. This is explicitly an experimental source-frame projection, not a seamless full scene. Separate scenery-repair work does not authorize changing the original tractor pixels.

## Deterministic export helper

`source_anchor.py` reproduces the same world-ray inverse camera transform, rectangular source frustum and smoothstep feather, with clamp-to-edge bilinear sampling. CLI takes `--panorama`, `--source`, `--camera` JSON, `--output` and `--width 3072` or `--width 4096`. It writes source/output hashes and projection metadata and refuses overwrites. Baked panoramas resample the native source; they are not byte-identical source images. Runtime keeps the native source separately. The initial pilot preceded the 24-stop export batch; see `BATCHES.md` and per-stop `selected.json` for current exports and review status.

## Final sourceLock v3 display proof

The optional trial now displays the orbit through a flat WebGL video texture and the panorama through the same RGB path. Direct video/canvas uploads agreed; the earlier discrepancy came from Chromium’s DOM video presentation. No filter or tone curve is added. The original default demo still uses its original DOM video path.

At exactly RVFC mediaTime 4.0 seconds, native 1280×720 orbit versus canonical entry has **mean RGB error 0.0 and p95 0.0 in the inner 88%**. Full-frame mean is 2.79/255 because the outer source feather intentionally transitions into generated scenery. This demonstrates protected-center display identity, not a seamless scenery boundary. Evidence: `browser-check/static-video-integration/{native-orbit,native-entry}.png`, `native-frame-proof.json`, `gpu-color-proof.json`.

Final desktop/mobile gesture checks passed again with the GPU orbit path: no bridge load, canonical entry/reentry, recenter then return at 4 seconds, no page errors. Captures/results: `browser-check/static-gpu-integration/`. Runtime revision is `tour-source-lock-v3`.

All 24 `stops/stop-XX/source-display.png` files were captured with canvas2D from browser-decoded video frames; sidecar JSON records requested and actual RVFC timestamps, video SHA-256, browser version and PNG hash. `source-display-manifest.json` indexes them. Originals remain unchanged. `capture-source-display.cjs` reproduces this operation and refuses different existing output. These frames support deterministic exports; their existence does not mark any panorama reviewed.
