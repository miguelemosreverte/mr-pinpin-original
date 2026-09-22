# Atlas renderer provenance and integration

Adapted at the user's explicit request from their Gaucho Atlas repository:

- Repository: https://github.com/GauchoAI/gaucho-atlas
- Local checkout: `/Users/miguel_lemos/work/gaucho-atlas-reference`
- Commit: `d80152ea3b62b94a87d82fa37760133ccd083160`
- `src/webgpu/renderer.ts`: persistent canvas, camera-center transform,
  16 center-sampled focus zones, lazy master-space slices, exponential focus
  accommodation with 300 ms time constant.
- `src/shaders/dof-bake.wgsl`: actual 64-sample golden-angle disc gather,
  depth-dependent sample reach, normalized highlight weighting; calibration
  preserved (`MAX_COC=12`, `COC_MULT=18`, threshold `0.6`, power `2`).
- `src/shaders/dof.wgsl` and `src/shaders/tile.wgsl`: camera inversion, y-down
  world coordinates, depth masking, sharp/color-preserving texture composition.

No license file or license declaration was found in the reference checkout.
This records user-authorized reuse, without inventing a third-party license.

## Local adaptation

No React, npm, remote runtime assets, lighting pass, or 3D geometry.
The complete original artwork spans a rectangular 1536 x 1024 world. Each UV
axis divides by its own world dimension; source pixels are not square-cropped.
Camera center and scale produce the view; the renderer never applies a CSS
transform to the world. Canvas CSS layout remains the controller's responsibility.
Pixels stay sRGB encoded in `rgba8unorm`, matching the source renderer. Turning
DOF off selects the original artwork, with no grading or exposure adjustment.

Navigation spans a centered 2304 x 1536 rectangle, from (-384, -256) to
(1920, 1280): 25% extra on each side of the unchanged 1536 x 1024 map.
`navigationBounds(worldWidth = 1536, worldHeight = 1024)` from `camera.js`
exports `{minX,minY,maxX,maxY,width,height}` for controller storage validation.
Panning clamps viewport edges to that rectangle; if an overview viewport exceeds
one axis, that axis stays centered. Opening scale remains exactly 2x original-map
cover, zoom limits still use original-map cover, and fit still fits the map.

Outside the actual map, the local `images/atlas/shire-floral-tile-v1.png` repeats
with a 512-world-pixel tile on both axes, anchored at world (0, 0), including
negative coordinates. Opposite PNG edges differ, so WebGPU uses `mirror-repeat`
and Canvas2D lazily builds a reflected 2x2 tile, including after device loss.
Neighboring edges match exactly; the full pattern repeats every 1024 world pixels.
The generated PNG is unchanged. Map/depth/overlay UVs
remain unchanged and contribute only inside the actual map, with no edge stretch.
The border stays sharp and does not participate in DOF. A missing tile reports
through `onError` and renders solid `#dce7d3` in both backends. Reload or recreate
the renderer after an initially missing tile arrives. Transparent tile pixels
use that same opaque backing color.

Depth is the local `images/atlas/shire-depth-v1.png`, read once for bilinear CPU
focus lookup and uploaded once for GPU sampling. It is an artistic monocular
estimate, not measured geometry; fine foliage and waterfall depth can be imprecise.
The parent's smooth depth image is used directly, without the source renderer's
additional bilateral depth refinement. Disc calibration is unchanged; the final
blend is restrained to 55%, preserving original sharp detail in focus. Enabling
DOF fades in over 600 ms. Focus uses the source's 300 ms exponential time constant.

The 16 possible zones are stored in a four-slice LRU. At 1536 x 1024 each slice
uses 6 MiB, capped at 24 MiB total. Artwork, depth and overlay add approximately
18 MiB at that resolution, excluding presentation textures and decoded CPU images.
At most one slice bake starts per animation frame, with at most one bake in flight.
GPU completion wakes pending work; warmed frames only sample cached textures.
Evicted textures are destroyed. Missing neighbors use sharp artwork until ready.
Overlay pixels are uploaded premultiplied and composed AFTER DOF, in the same
world UVs, keeping transparent white paths and sprites sharp.

## API

```js
import { createRenderer } from './gpu/renderer.js';
const renderer = await createRenderer({
  canvas, artSrc, depthSrc, overlayCanvas, borderSrc, onError
});
const needsFrame = renderer.render(
  { x, y, scale, width, height },
  { focus: [worldX, worldY], dof: true }
);
```

`x/y` are world-pixel camera center; `scale` is CSS pixels per world pixel;
`width/height` are viewport CSS pixels. The bitmap follows device pixel ratio,
capped at 2 and the device's texture limit. `render` coalesces requests into rAF;
the renderer schedules its own easing and pending cache work when motion stops.
The boolean reports ongoing DOF animation/work and can drive a controller loop.

`borderSrc` optionally overrides the floral tile URL. Omit it for the module-relative
local default; pass `null` for the solid color. `BORDER_TILE_SIZE` exports the fixed
512-world-pixel tile size. Border loading failures do not disable WebGPU or DOF.

`overlayCanvas` is a transparent world-space canvas, ideally 1536 x 1024. By
default each external `render` request uploads it on the next frame. Supply
`overlayVersion` when using explicit revision tracking, or `overlayDirty:false`
for camera-only calls. Internally scheduled focus frames reuse its texture.

Additional API: `resize(width,height)`, `setDof(boolean)`, `destroy()`, live
`backend` getter, `stats` getter (adapter identity, draws, uploads, focus/cache).
Named alias `create` and default object `{create,createRenderer}` are available.
The actual canvas exposes `data-renderer="webgpu|canvas2d|destroyed"` and
`data-dof="on|off"`. These indicate actual rendering capability/state.

Unavailable WebGPU or initialization errors use Canvas2D with identical camera
math and no DOF. Missing depth reports an error and retains sharp GPU rendering.
Device loss or uncaptured GPU errors release GPU resources and switch to 2D.
Since browsers cannot change a canvas's context type, post-initialization failure
draws a scratch 2D canvas into a bitmap background on the original canvas element.
The element and controller reference persist; only this exceptional fallback
incurs PNG encoding per frame. No automatic GPU retry loop. Destruction cancels
animation, destroys cached textures/buffers/device, and restores its background.

## Verification

Chrome headless on secure-context `http://127.0.0.1:8767`, using its default Apple
`metal-3` adapter with `isFallbackAdapter=false`. No SwiftShader flags.
The temporary harness is `/tmp/pinpin-test-renderer.cjs`; measurements and
screenshots are recorded in `/tmp/pinpin-webgpu-renderer.md`.

Floral navigation verification: `/tmp/pinpin-floral-camera.md`, with the temporary
renderer probe at `/tmp/pinpin-floral-renderer-check.cjs` and measured results at
`/tmp/pinpin-floral-renderer-results.json`. Both scoped camera suites pass all
19 tests with hardware Chrome enabled. GPU/2D mirror seams differ by at most one
8-bit color level; shifting by 1024 world pixels reproduces the exact image.
Desktop, 390px and 320px touch views remain nonblank and fixed during panning.
Forced device loss retains the pattern; missing border assets retain the solid
fallback. Original-map sharp rendering remains pixel-exact in both backends.
