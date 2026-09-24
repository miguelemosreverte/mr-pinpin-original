# Historical illustration projection helpers

The bootstrap combines **historical A’s base and all four completed repairs** into one 3072×1536 equirectangular image. It introduces no new Blender render, geometry, artistic repair, furniture or color grading. This image-led experiment is explicitly separate from the current measured three-room location workflow; the older common room is its starting illustration, not the canonical three-room plan.

## Delivered inputs

| File | Purpose | Actual size |
|---|---|---|
| `common-rear-before.png` | Prepared diagnostic/reference; the actual common door edit used original `room-cube-rear-v1.webp` directly | 1400×1400 |
| `common-bootstrap.png` | Entire completed historical illustration, with front/rear/up/down repairs baked | 3072×1536 |
| `common-forward-reference.png` | Ordinary entry view for appearance/orientation reference | 1400×1400 |

Heavy originals are in `/Volumes/TB4/mac-mini-storage/shared/pinpin-house-image-tour-20260924/`; source entries are specific symlinks. Matching manifests live in `projection/`. The rear target is yaw 180°, pitch 0°, square 110° FOV; the forward reference is yaw 0°, pitch 0°, square 100° FOV. The rear target is sampled directly from the original five textures, avoiding an unnecessary intermediate panorama resample.

Book references were resolved through the reusable location manifest and their file hashes checked. `projection/book-references.json` records the exact identities:

- Bathroom: `docs/storyboard/images/standalone/home-sweet-home/bedtime-08-v2.png`, approved broad wooden tub, mat and family bathing scene.
- Bedroom: `docs/storyboard/images/standalone/home-sweet-home/bedtime-17-v2.png`, approved wooden bed, quilt and family bedtime scene.

Those are design/style references with their stated scope, not a geometric survey. Existing licensing notices continue to apply.

## Exact runtime blend contract

Frozen copies of `home-panorama-gl.js` and `home-panorama-config.js` are retained under `projection/`. The source is `room-panorama-v3.webp` plus the four `room-cube-{front,rear,up,down}-v1.webp` images. Every input hash is recorded in each historical extraction manifest.

The implementation ports the runtime’s 110° perspective coordinates, local axes and masks directly. Each patch fades with `1 − smoothstep(.70,.96,max(abs(q)))`; the front additionally uses center `[.102,−.028]`, extent `[.075,.075]`, and its `.60→1.0` mask falloff. Base weight is `1 − max(patch weights)`. The final RGB is the normalized weighted sum, including overlapping repairs. All source textures use pixel-center bilinear sampling and clamp-to-edge, with the base longitude wrapped before sampling, exactly as in the shader. Sampling occurs in encoded RGB, without gamma or exposure edits.

World orientation is front **+Y**, right **+X**, up **+Z**. Equirectangular front is `(u=.5,v=.5)`; rear is the left/right wrap; right is `u=.75`. The runtime’s internal `[x,y,z]` ray is world `[X,Z,Y]`. Image rows point downward. A bake at higher dimensions preserves the supplied texture detail; it does not create new detail or prove a seamless original.

## Verification

`projection/verify-runtime.cjs` independently rendered the actual current WebGL implementation at five camera poses: front, rear, exact up, exact down, and the rear/up overlap. `projection/compare_runtime.py` compared 256² decoded frames with the CPU blend. Every pose differed by **at most one 8-bit channel value**; mean absolute channel differences were 0.020–0.029. `projection/runtime-comparison.json` records the measurements. These small GPU/CPU filtering and rounding differences mean the bake is not advertised as byte-identical to every GPU framebuffer.

The output and rear target were visually inspected. They retain the completed illustration, including its residual rear-floor repair boundary. Projection checks establish orientation and blending, not art approval, room connectivity or improved seams.

## Reproduction and reusable extraction

Use Python with NumPy; the existing mini environment used for this run is:

`/Volumes/TB4/mac-mini-storage/tools/blender-4.5.14/Blender.app/Contents/Resources/4.5/python/bin/python3.11`

Only that Python executable is used; **Blender is not invoked**. WebP decoding uses existing `/opt/homebrew/bin/ffmpeg`. The five WebPs are retained under the external `inputs/` directory. Their PNG decode derivatives are cached beside them. To reproduce with different input bytes, use a fresh inputs directory so cached decodes cannot be confused with another version.

From the external work directory:

```sh
python3 projection/project.py historical-view --inputs inputs --output common-rear-before.png --yaw 180 --pitch 0 --fov 110 --size 1400
python3 projection/project.py bake --inputs inputs --output common-bootstrap.png --width 3072
python3 projection/project.py historical-view --inputs inputs --output common-forward-reference.png --yaw 0 --pitch 0 --fov 100 --size 1400
```

For an arbitrary new 2:1 panorama, use a fresh output name:

```sh
python3 projection/project.py extract --input proposed-panorama.png --output rear-reference.png --yaw 180 --pitch 0 --fov 110 --size 1400
python3 projection/project.py extract --input proposed-panorama.png --output ceiling-reference.png --yaw 0 --pitch 90 --fov 110 --size 1400
python3 projection/project.py extract --input proposed-panorama.png --output floor-reference.png --yaw 0 --pitch -90 --fov 110 --size 1400
```

Angles are degrees, the perspective is square, and the camera origin does not translate. Generic panorama extraction wraps longitude and clamps latitude. It does not paint a correction or invent pixels outside the spherical input. `trusted_reproject.py` also retains the previously verified deterministic panorama-to-cube conversion if a later viewer needs it.

The refined common-room proposal may retain the historical runtime base/front/up/down and replace only the rear repair. The delivered bootstrap is supporting input/provenance; its creation does not require replacing that runtime stack. No new model calls, UI changes, archive selection or publication were made in this lane.

## New-room diagnostic extractions

The first bath and bedroom panorama candidates were each sampled at exact up (+90°), exact down (−90°), and rear (yaw 180°); bath also has a front (yaw 0°) doorway view. Every diagnostic is 1254×1254 with 110° square FOV, emitted by the same `extract` operation on the mini. `projection/room-diagnostics.json` and the seven sibling JSON records preserve source hashes, camera values and output hashes. Source PNG entries link to the external `{bath,bedroom}/` directories.

Visual inspection of those seven inputs found the largest distortion at **both floor poles**: the floorboards and braided mat converge into a cusp beside the tub or bed. The bath front also shows an inconsistent leaf/hinge assembly and neighboring knobs requiring interpretation. Both ceiling views have comparatively coherent crossed timbers, without the severe looped pole collapse of the earlier native experiment. Rear views are substantially readable; the bedroom has an awkward central timber descending through the window/dresser boundary. These are diagnostic observations before any new repairs, not approval or a claim that a new repair succeeded. No image-generation call was made in this projection lane.

## Wider bath-door derivative

At the operator’s request, `projection/bake_bath_door.py` resamples only the bath base to 3072×1536 and composites the already generated front patch with full weight through `max(abs(q))=.94`, feathering to zero at `.995`. FOV remains 110°, yaw/pitch 0°. This covers the old leaf tip beyond the usual runtime feather. `bath/panorama-door-v2.json` records identities, coverage, and the passing outside-mask comparison against the same-resolution base resample. Original art is unchanged. A diagnostic perspective at yaw 0°, pitch 20° showed the former left leaf tip removed; the corrected right leaf remains. The UI agent checks the live front overlay and surrounding joins separately. This adds no new image-generation call.

A second authorized derivative, `bath/down-door-v2.png`, reprojects that same generated front correction into the existing downward repair using the identical .94→.995 front mask and matched 110° ray bases. All downward pixels outside the mask remain byte-identical to `down-v1.png`. Metadata and `projection/bake_bath_down_door.py` retain the arithmetic. Inspection found a small old-leaf stump beyond the front image’s lower angular coverage, so this derivative alone is not reported as fully resolving the overlay issue. It is preserved as a versioned intermediate; final visual selection belongs to the review.

The subsequent **generated** cleanup `bath/down-v3.png` removes that small stump and blurry scar. It was produced by one additional built-in imagegen call from `down-door-v2.png`, with exact prompt/input/output identities in `bath/down-generation-v3.json`. Inspection confirms the detached fragment is gone and the principal tub, rug and right-hand door remain recognizable. This is a separately preserved artistic edit, not deterministic projection or a claim that untouched pixels are byte-identical. The intermediate v2 and its known limitation remain in provenance; v3 is the later cleanup used for final review.
