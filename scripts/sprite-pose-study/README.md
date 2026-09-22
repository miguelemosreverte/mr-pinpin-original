# Neutral sprite pose study

## Native video extraction and review

`video_derivatives.py` reads two original MP4s without modifying them and writes
only into a new output directory. Native files are hashed before and after.
Each angle gets one diagnostic whole-clip one-second retime (24 fps, maximum
512px dimensions), six or twelve sample cells, and an exact first/last pair.
`--sprites` adds one 24-frame 256px-cell sheet per angle, not 48 loose PNGs.
No endpoint is deliberately removed as a duplicate; retimes resample the full
native timeline. Retiming is not cycle detection, motion repair, or gait approval.

```sh
python3 video_derivatives.py --angle105 NATIVE_105.mp4 --angle120 NATIVE_120.mp4 \
  --output NEW_SSD_DIRECTORY --samples 12 --sample-size 384 --sprites
```

Uses installed FFmpeg/ffprobe (mini defaults `/opt/homebrew/bin/`), no Python
dependencies. The version-1 `video-derivatives-manifest.json` records native
absolute paths, hashes, actual decoded counts/timestamps, derivative relative
paths/hashes, sheet grid/ordering, and review fields. Archive handoff is separate
from production approval; `archive_ready` stays false pending operator signoff.
No direct peer-send tool exists in this lane; main relays the manifest to the
storage/review owner (Dewey/Pauli).

Completed run: external video-trial root `diagnostics-v01/`, with eight image/video
derivatives plus manifest and `visual-review.md`. Both native clips are 1920x1080,
24 fps, 145 frames, 6.041667 seconds. Both diagnostic retimes verify as 24 frames
and one second. Twelve native samples and first/last pairs were inspected:

- 105: repeated forepaw actions; coordinated four-leg walking is not demonstrated.
  Exact valid gait-cycle count is unknown; no purported single-cycle crop exported.
- 120: repeated paw-to-chin gestures, largely static hind feet; not walking.
- Both have visually close endpoint poses, consistent with endpoint conditioning
  helping closure. Decoded hashes differ; neither exact duplication nor seamless
  gait closure is claimed. Both clip quill tops; 120 also clips the near hind foot.
- Diagnostic-only rejection for gait and framing. No paid retries or production
changes. Original downloads and provider sidecars remain untouched.

The external `visual-review.md` records the exact input chain separately from
output failures: neutral guide + book face `timber-tractor/scene-17.png` + book
body `chapter-02-direct/scene-10-v2.png` went to imagegen, whose pose changed;
the two exact appearance crops then went individually to LTX as first/last
stills with a text prompt. The videos never received rig animation or foot
trajectories. Anchor anatomy was not validated; video gestures and clipping
are additional failures. Exact prompts/settings are linked to retained sidecars.

Five unit tests pass (three gait tests plus two sample-index tests); actual
FFmpeg extraction succeeded. Full pixel/hash/timing provenance and detailed
observations are in the external manifest/report. Archive those as failed-study
evidence only after the operator's browser/storage handoff.

## Two-camera video boundary trial

New external root:
`/Volumes/TB4/mac-mini-storage/shared/pinpin-video-sprite-trial-20260922/`

`anchors-v01/boundary-phase0-105-120.png` is the single horizontal 1024x512
reference sheet: left panel 105 degrees, right panel 120 degrees, both phase 0.
Separate 512x512 guides are `boundary-phase0-angle105.png` and
`boundary-phase0-angle120.png`. These have an opaque neutral ground backdrop and
contact shadows, unlike the previous transparent motion frames.
Sheet SHA-256: `8b9a700779c7d7aefb75e9f88a8c87896dc36491fcdc973451ff6267d1d61430`.

`boundary_anchors.py` reuses the previous verified `.blend` and analytic `pose`
function, rendering only these two phase-zero images. Both cameras use 30-degree
elevation, orthographic scale 4.8, and target `(0, -0.12, 1)`; ground is z=0.
Azimuth 0 is front (-Y), 90 is anatomical left (+X), and 105/120 turn toward
the rear (+Y). This is not a camera orbit: each video should hold its angle
fixed, complete one gait cycle, then switch views at the shared phase boundary.
A requested slow six-second native cycle would be retimed to one second only
after checking that the delivered video actually contains one complete cycle.
Neither timing nor video closure is established by these still guides.

At phase 0, root travel is zero and all upper/lower/foot bone positions are
identical between angles. Feet/anchors in authored units:

| Chain | Leg phase | State | Foot center (x,y,z) | Ground anchor |
| --- | --- | --- | --- | --- |
| front_L | 0 | contact | (0.45,-0.87,0.09) | (0.45,-0.87,0) |
| front_R | 0.5 | contact | (-0.45,-0.503333,0.09) | (-0.45,-0.503333,0) |
| rear_L | 0.75 | lift | (0.61,1.094190,0.260711) | none; sole above ground |
| rear_R | 0.25 | contact | (-0.61,0.973333,0.09) | (-0.61,0.973333,0) |

`anchors-v01/boundary-anchors.json` contains unrounded hip/knee/foot positions,
every evaluated bone head/tail, both camera matrices, and image/blend/input
hashes. Bone equality across views and foot-target agreement passed; both
guides passed contrast checks and were visually inspected for complete body,
feet, and consistent framing. `boundary-anchors.blend` retains the grounded
scene. No imagegen, video generation, production changes, or edits to original
inputs were performed. Subsequent native-video extraction/audit must write new
outputs and retain the original downloads unchanged.

Run from a mini-side copy of this folder:

```sh
"$BLENDER" --background --python-exit-code 1 --python boundary_anchors.py -- \
  --source-study /Volumes/TB4/mac-mini-storage/shared/pinpin-sprite-pose-study-20260922/control-4-angle105-v01 \
  --output /Volumes/TB4/mac-mini-storage/shared/pinpin-video-sprite-trial-20260922/NEW-anchors
```

`BLENDER` is defined in the Run on the mini section below. The initial copied
script inputs are retained under the new external root's `scripts/` directory.

## Control scope

Offline articulated **control proxy**, not final PinPin art. This builds new
primitive geometry using proportions from `../blender-pinpin/config.py`.
It does not import, modify, or claim to rig the existing static v3 model.
No production files, paid image generation, or third-party model are used.

## Initial handoff

Mini/TB4 run root:
`/Volumes/TB4/mac-mini-storage/shared/pinpin-sprite-pose-study-20260922/`

- `control-4-angle105-v01/`: four 512px RGBA poses, `control-2x2.png`,
  `control-study.blend`, `study.json`, and `verification.json`.
- `control-8-angle105-v01/`: eight 512px RGBA poses and the same evidence/blend
  files, without a contact sheet.
- `scripts/`: exact external run inputs, including a copy of the existing
  proportions config. The initial verifier was named `inspect.py`; its source
  is now `verify.py` to avoid shadowing Python's standard `inspect` module.

Four-pose plate order: top-left, top-right, bottom-left, bottom-right, at
`t=0, .25, .5, .75`. Plate SHA-256:
`65686af438930accbb52641a8ca087b1e7a739752c64a1df2ad5242dbc789bdf`.

Use this plate only for pose/framing control. Supply an approved true-book
reference separately and prioritize that reference for identity, face, spines,
color, and illustration style. The simple proxy face is not a character target.

## Run on the mini

The installed binary is Blender 4.5.14 LTS. Run these commands on the mini after
copying this folder and the proportions config to SSD, or from a full SSD source
checkout. Shell variables below describe the initial copied-input layout:

```sh
BLENDER=/Volumes/TB4/mac-mini-storage/tools/blender-4.5.14/Blender.app/Contents/MacOS/Blender
RUN=/Volumes/TB4/mac-mini-storage/shared/pinpin-sprite-pose-study-20260922
export LC_ALL=C LANG=C
export TMPDIR=/Volumes/TB4/mac-mini-storage/tools/blender-4.5.14/tmp
"$BLENDER" --background --python-exit-code 1 --python "$RUN/scripts/build.py" -- \
  --config "$RUN/scripts/config.py" --frames 4 --angles 105 \
  --output "$RUN/NEW-control-4"
"$BLENDER" --background --python-exit-code 1 --python "$RUN/scripts/verify.py" -- \
  --study "$RUN/NEW-control-4"
```

Output must be a new directory; existing directories are never replaced by the
builder. The verifier writes its report and, for four frames, assembles only
these freshly rendered control images into a 2x2 PNG with Blender image APIs.
It is not an AI-image editing step. No extra packages are required.

| Option | Meaning |
| --- | --- |
| `--frames 4/8/16/30/60` | Exactly N samples at `t=k/N`; no duplicate endpoint |
| `--angles 90 105 45` | Degrees: 0 front (-Y), 90 side (+X), 105 rearward three-quarter; fixed 30-degree elevation |
| `--size 512` | Square RGBA pixels; 64..2048 accepted |
| `--config PATH` | Existing body-proportions module; default is sibling blender-pinpin/config.py |
| `--output NEW_DIR` | New external output directory, preferably mini/TB4 |

For low-resolution dense motion, run `--frames 30 --size 128` into a separate
directory. For sparse appearance guidance, run `--frames 4 --size 512` (or 1024).
Every sample re-evaluates the articulated proxy from its analytic time, never
from a previous image or recursive image-model edits. Shared phases are exact
between 4/8/16; 30-frame sampling has different intermediate phases. New angles
reuse the same geometry and phase data with the same orthographic scale.

## Rig and contact convention

Four named chains: `front_L`, `front_R`, `rear_L`, `rear_R`, each with upper,
lower, and foot bones. Rigid mesh pieces use single-bone vertex weights and an
armature modifier. Head and eyes have separate controls; only a slight head nod
is animated. No hidden retargeting, simulation, or final skinning is implied.

Two equal-length links analytically reach each foot target. Stance occupies 60%
of a cycle; swing lifts and returns the foot. Foot pieces remain level with their
soles at z=0 in stance. The body is camera-stabilized/in-place in the renders.
`root_motion_world` records equivalent forward travel: adding it to each foot
gives a constant `ground_anchor_world` during each stance. A new step has a new
anchor. Do not interpret stationary-body renders as literal fixed-world contact.
Units match the authored proportions; JSON gives the scale to nominal meters.

`study.json` records time, limb phase/state, hip/knee/foot coordinates, evaluated
Blender foot-bone positions, contact anchors, camera matrices, source/config
hashes, PNG hashes/bytes, and the blend hash. Each .blend contains all sampled
keys. The renderer explicitly evaluates each analytic pose; arbitrary in-between
Blender interpolation is not claimed to preserve exact contact or loop dynamics.

## Verification and limits

`python3 -B -m unittest discover -s scripts/sprite-pose-study -p 'test_*.py' -v`
passes three tests covering 4/8/16/30 sampling, all-leg movement/contact/swing,
loop position closure, link lengths, sole height, and fixed virtual stance anchors.
The initial four- and eight-frame renders passed nonblank RGBA, safe full-body bounds,
distinct PNG hashes, moving evaluated feet, and contact/swing for every leg.
Reloading both saved blends and evaluating every keyed frame also passed: foot
bone positions and actual deformed foot-mesh centers match their analytic
targets with maximum error `2.497889789080651e-7` authored units. These results
are recorded in each run's external `verification.json`.
The initial plate was visually inspected: pose differences are visible, with
occlusion of far limbs at this side-biased angle as expected.

This is a kinematic proof, not physical gait realism, anatomical approval,
collision-free animation, final artwork, or evidence that an image model will
preserve motion. Image hashes alone are insufficient: evaluated-foot assertions
and analytic contact tests are separate checks. More frames/angles and image-model
appearance transfer remain subsequent experiments, not production assets.
Gait/phase sampling is deterministic; byte-identical render reproduction is not
claimed. A 4-vs-8 shared-phase PNG comparison differed (render timing/date
metadata and rendered payload); both runs independently passed pose/mesh and
pixel checks. Hashes identify each output, not a promise of cross-run equality.
