# Room depth rendering reference

Reviewed 2026-09-22. Research only: no PinPin source edits, generated assets or deployment changes. Reference commit: `c6e626d0ed639c8440821d9acd99570ce9e4fd90`, unchanged from prior review. Sources are the repository itself, fetched with GitHub API and immutable raw URLs. Local inspected copies and extracted reference depth PNGs are under `reference/`; they are research materials, not redistribution assets.

## Findings that affect the implementation

The reference implements depth-aware WebGPU bokeh and an image-depth mesh, but exposes them as separate modes. Its reprojection mode explicitly turns off DOF and object interaction. It rotates the camera at the original eye without translation; this produces perspective changes but not depth-dependent motion parallax. PinPin should combine the useful mechanisms while keeping its links, touch camera and fallback active.

The reference has no LICENSE file; GitHub metadata reports `license: null`. Its tree contains only `.nojekyll`, `README.md`, `index.html`, `viewer-data.js`. Independently implement the mathematics and interaction concept; do not copy the shaders, renderer or supplied artwork. Existing PinPin `gpu/**` code also has its own recorded license exclusion; reusing it is not a shortcut to establishing third-party licensing.

## Exact source map

All links below pin the reviewed commit:

- [README and controls](https://github.com/miguelemosreverte/ui-experiment/blob/c6e626d0ed639c8440821d9acd99570ce9e4fd90/README.md): D cycles DOF, R switches reprojection, number keys select layers; desktop-oriented experiment.
- [Depth/renderer constants and WGSL, index.html lines431–626](https://github.com/miguelemosreverte/ui-experiment/blob/c6e626d0ed639c8440821d9acd99570ce9e4fd90/index.html#L431): `BOKEH_WGSL`, `BLIT_WGSL`, `WARP_WGSL`, `REPROJ_WGSL`.
- [Depth load and CPU fallback, lines628–697](https://github.com/miguelemosreverte/ui-experiment/blob/c6e626d0ed639c8440821d9acd99570ce9e4fd90/index.html#L628): `initDOF`, `precomputeDOF`.
- [WebGPU resources, lines706–828](https://github.com/miguelemosreverte/ui-experiment/blob/c6e626d0ed639c8440821d9acd99570ce9e4fd90/index.html#L706): `initBokehDOF`; plain WebGPU API, no Three.js or external renderer dependency.
- [Focus animation and dispatch, lines832–924](https://github.com/miguelemosreverte/ui-experiment/blob/c6e626d0ed639c8440821d9acd99570ce9e4fd90/index.html#L832): cursor depth, exponential convergence, bokeh compute and fullscreen blit.
- [Projection and mesh, lines1134–1368](https://github.com/miguelemosreverte/ui-experiment/blob/c6e626d0ed639c8440821d9acd99570ce9e4fd90/index.html#L1134): handwritten matrix helpers, `buildReprojMesh`, `initReprojPipeline`, `renderReproj`.
- [Mode limitations, lines1405–1465](https://github.com/miguelemosreverte/ui-experiment/blob/c6e626d0ed639c8440821d9acd99570ce9e4fd90/index.html#L1405): disables DOF, highlights, tooltip and normal interaction while reprojection is active.
- [Pointer focus, lines1484–1516](https://github.com/miguelemosreverte/ui-experiment/blob/c6e626d0ed639c8440821d9acd99570ce9e4fd90/index.html#L1484): converts mouse position through the unwarped image rectangle and reads depth at that source pixel.
- [Asset cache, lines1735 onward](https://github.com/miguelemosreverte/ui-experiment/blob/c6e626d0ed639c8440821d9acd99570ce9e4fd90/index.html#L1735): IndexedDB stores assets by short content hashes; seven-day eviction, fallback loads `viewer-data.js`.

## Depth representation and input assets

Inspected actual PNG headers and sample values, not only variable names. The original is 1184×880, RGB8 PNG. `layers.depth` is **16-bit grayscale PNG**, also1184×880, 908,553 bytes. Other scene states have their own 16-bit depth maps; outside is1112×828. `reference/assets-inspected.json` records all inspected headers and manifest keys.

Runtime precision is nevertheless eight-bit: depth is drawn into a 2D canvas, its red channel copied into `Uint8Array`, and the GPU texture is `rgba8unorm` sampled through `.r`. No linearization or metric camera calibration is recorded. This is relative scene depth, not a measured room. Black means near, white means far in the reconstruction. Actual 16-bit samples confirm near floor607 and outside64543 on a0–65535 range. No depth-estimator model provenance or generation code is supplied in the repository.

PinPin's newly selected `docs/storyboard/images/house-menu/room-depth-v1.webp` has the **opposite** convention, as specified by the root: white near, black far. Use an explicit conversion, for example positive distance `near + (1-gray)*range`; do not feed it directly into the reference convention. For DOF, comparing distances consistently is sufficient; geometry needs the correct sign. Treat depth as data, avoiding sRGB conversion. Keep it pixel-registered to the1536×1024 room, and retain the original PNG/prompt provenance separately.

Minimum room inputs: unchanged approved RGB illustration, aligned depth field, and the existing two SVG object boundaries. Normals/PBR textures are not required for parallax or DOF. Optional background completion/layers are needed only if camera movement reveals previously hidden parts behind the door, furniture or foreground; a single image/depth field cannot supply that information. Separate image URLs fit PinPin better than the reference's65,131,285-byte all-assets JS bundle and IndexedDB loader.

## Camera mechanics

The vertex shader back-projects each source pixel through a60° vertical field of view, original image aspect, and positive distance `z=.5+5*d`, then applies perspective with near/far clipping .1/100. CPU controls update yaw by .005 radians per mouse pixel, pitch similarly clamped to±90°. Reprojection has mouse dragging only; there is no touch pinch or translational camera position. Its cube-face controls merely rotate the same single depth image; they are not six captured environment faces.

Mathematical implication: reconstructed points are `z*ray`. Under pure rotation, perspective division cancels the scalar z. Thus differing depths do not independently shift pixels as they would under a lateral camera translation. Depth still affects clipping, triangle continuity and depth tests. To obtain the user's requested relative foreground/background movement, add a small, bounded lateral camera component or an equivalent depth-dependent inverse warp; a uniform CSS perspective transform alone is insufficient.

The mesh uses one vertex per image pixel and two triangles per cell. It skips an entire cell if any of its four depths differ by over15/255, avoiding stretched triangles across object discontinuities but leaving holes. Backface culling is disabled, `depth24plus` uses less-than testing, and uncovered pixels clear black. Those holes and unconstrained rotations are unsuitable for the room's viewport-fill requirement.

## DOF mechanics

Bokeh is a fullscreen compute pass with64 golden-angle disk samples per blurred pixel,8×8 workgroups. Radius is `clamp(abs(depth-focus)*18,0,12)*strength`, in source pixels; very small radii bypass blur. It rejects samples whose own circle of confusion is too small for the offset and boosts bright sample weights above luminance .6 with exponent2. This is a depth-based artistic blur approximation, not a calibrated optical lens.

The cursor sets focus depth. Focus approaches its target with exponential rate2.5/second, snapping inside .002, and animation stops after settling. Video transitions fade DOF out/in over five seconds; optional optical-flow video warps accumulated depth using RG displacement channels. None of that video-flow machinery is needed for the static PinPin room.

CPU fallback precomputes ten focus-zone RGBA composites by mixing original and preblurred images. It quantizes focus and is memory-heavy; retaining the already working sharp 2D room is a better baseline fallback here.

## Practical PinPin integration

Keep the current pan/zoom controller, cover bounds, fixed flags, drag suppression and native destinations. Introduce a separately initialized renderer with the flat room visible until its first successful frame. Let current camera center drive a restrained viewpoint offset; keep enough overscan and clamp its range to avoid exposing unsampled boundaries. Calibrate on doorway edges, shelf uprights and foreground floor at all portrait/landscape pan limits before increasing the effect.

Combine projected color and projected depth in one camera convention, then apply restrained DOF using that projected depth. Choose focus from hovered or keyboard-focused target; on touch use a deliberate target or viewport center after settling. A short eased focus change and roughly3–5 CSS-pixel maximum blur are starting design values, not measurements from this reference. Keep navigation contours and flags sharp. Avoid continuously hunting focus during a drag.

**Hotspot alignment is required.** A transformed image under unchanged SVG paths would break both contours and clicks. Two viable approaches:

1. Project dense samples of each existing SVG contour through the same piecewise depth mesh used by the illustration. Update the rendered path and native anchor's hit region together; keyboard reveal uses the same projection. This is B's proposed lightweight implementation. Sampling must use the same mesh interpolation, not unrelated bilinear depth lookup, and hidden portions must not remain clickable.
2. Render a two-object ID mask through the identical projection, derive visible contours and picking from the projected IDs, and retain DOM links as keyboard/semantic controls. This handles occlusion more exactly but adds GPU picking/synchronization complexity.

Either approach must share source UV, depth convention, camera matrix, viewport/DPR and crop with the art. Independent nearest-depth guesses for pointer clicks are not sufficient near outlines. Treat the flags as fixed screen UI and do not use their taps to retarget focus.

Performance estimates, not device benchmarks: a native1536×1024 mesh requires1,572,864 vertices and up to3,140,610 triangles, about50.3MB of vertex/index data per full copy. The reference's ten CPU composites would occupy about62.9MB here. A64-sample full-image blur can visit about100.7million sample positions per frame before early-outs. Begin with a coarser mesh (e.g.384×256 cells, roughly197k triangles), adaptive edge refinement if needed, modest postprocess resolution, and render-on-change/stop-after-settle. Prefer graceful quality reduction over taxing mobile devices continuously.

Fallback must retain current functional 2D pan/zoom and anchors when depth fails, GPU setup fails, context/device is lost, or reduced motion is requested. No new framework is necessary; independently written WebGL2 is a plausible implementation choice if it fits B's renderer. Validate native mobile pan/pinch, all viewport bounds, rotation, keyboard focus and actual door/bookcase navigation after the depth layer is added—not merely a screenshot or a shader demo.
