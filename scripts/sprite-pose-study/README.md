# Neutral sprite pose study

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
