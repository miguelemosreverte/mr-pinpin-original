# Hybrid sprite study

Status: offline experiment, not production approval. No runtime, production
inventory, published media, or production asset manifest changes are part of this study.

## Proposal, recommendation, implementation

**User proposal:** combine controllable rig motion with the illustrated book
appearance, then explore progressively denser sprite animation. Low-resolution
motion and high-resolution appearance keys are possible ingredients, not proof
that detail or temporal consistency will survive the combination.

**Recommendation:** start with one character, one camera angle, and four sampled
poses. Compare an eight-pose guide from the exact same rig action and cycle
duration. Review before expanding to 16 and 30 frames, then more headings and
characters. Keep the current atlas untouched until offline results are approved.

**Implemented in this lane:** `scripts/plan-sprite-study.cjs` writes an external
JSON plan and a usable prompt template, hashes supplied reference/guide files,
reports missing roles, and estimates memory. It does not render, generate images,
interpolate, pack sheets, install models, submit paid calls, or approve appearance.
The separate `scripts/sprite-pose-study/` lane owns Blender guide implementation;
consult that lane's actual outputs rather than treating this plan as render proof.
Image generation and visual review remain separate operator-owned steps.

## First executed trial, 2026-09-22

The [control-study implementation](../../../scripts/sprite-pose-study/README.md)
now renders four and eight 512px poses at camera azimuth 105 degrees and elevation
30 degrees. Three gait tests and saved-rig checks verify moving foot targets,
contact anchors, mesh placement and full-body image bounds. This is a new neutral
articulated proxy, not a claim that the existing static v3 model has been rigged.

The [reference audit](hybrid-sprite-baseline.md) selected Timber Tractor scene 17
for the face and chapter-two scene 10 v2 for the body. Both are existing book
selections, not newly approved sprite references. One built-in image-generation
call produced a four-frame appearance candidate; the reported call time was
60.3 seconds. The output, exact submitted prompt, timestamps, reference hashes
and initial review are adjacent files named `pinpin-appearance-4-v01.png` and
`pinpin-appearance-4-v01.md` in
`/Volumes/TB4/mac-mini-storage/shared/pinpin-sprite-pose-study-20260922/`.

The candidate has book-like face/material detail and visibly different poses,
but changes the guide's proportions and some paw positions. Occluded limbs and
contact motion are not certified. It is not approved or installed in the atlas.
Eight-frame appearance generation, optical-flow interpolation, high-resolution
temporal reconstruction, extra headings and the other characters remain untested.

The planner supports `--angles 1 --angle-offset 105` to record this actual camera
angle rather than implying a front-view study. Its saved plan is a separate
reproducible planning example; the candidate sidecar holds the exact prompt that
was actually submitted. Eight planner tests pass after adding the angle offset.

The standalone review is
`/Volumes/TB4/mac-mini-storage/shared/pinpin-sprite-pose-study-20260922/review-v3/index.html`.
It compares synchronized four/eight-pose controls and the candidate's unnormalized
four-cell animation at large and 56px cell sizes. Mobile 375px and desktop 1280px
checks passed for changing pixels, phase synchronization, pause, offscreen stop,
reduced motion, asset decoding and overflow. These are presentation checks, not
approval of anatomy or gait. The exact prompt and source hashes are on the page.

Rebuild with `node scripts/build-hybrid-sprite-review.cjs --four FOUR_STUDY_DIR
--eight EIGHT_STUDY_DIR --reference BOOK_IMAGE --candidate CANDIDATE_SHEET
--out NEW_EXTERNAL_REVIEW_DIR`. Run its optional browser verifier separately:
`node scripts/verify-hybrid-sprite-review.cjs EXTERNAL_REVIEW_DIRECTORY`.
The initial fixture layout keeps the review beside `control-4-angle105-v01`.

Experimental source files and images are preserved separately using
`tools/assets/hybrid-sprite-study-preservation.json`; see the
[archive verification and restore instructions](../../../tools/assets/verification-hybrid-sprite-archive.md).
That dedicated archive manifest does not select anything for the live atlas.

## Two distinct inputs

- **Appearance reference:** approved book identity, proportions, face, clothing,
  palette, materials, and line/paint treatment. It is not the pose specification.
- **Rig motion guide:** camera, heading, silhouette, joints, contact timing,
  overlapping limbs, ground plane, framing, and foot anchor. Placeholder rig
  colors/materials must not replace the illustrated appearance.

Match rig proportions to the reference before rendering. A guide with incompatible
anatomy is a rig-review problem, not an invitation to invent anatomy during image
generation. Supply the matching guide for each output pose. If using a sheet,
name the exact guide cell. Input hashes identify bytes, not their visual quality.

Four appearance keys can establish an art direction but do not prove a walk.
Inspect stance/swing timing, planted-foot sliding, limb crossings, balance, and
loop closure. Render a dense guide from one rig/action rather than repeatedly
editing the previous generated image, which can accumulate appearance and pose
drift. Rig guidance constrains the target; it does not guarantee model obedience.

## Stages and timing

1. Four frames: check appearance and broad poses at one angle. Do not certify motion.
2. Eight frames: compare with four using the same cycle length, camera, scale,
   anchor, and action. Test crossings, contacts, and the last-to-first transition.
3. Sixteen frames: proceed only if the eight-frame loop passes review.
4. Thirty frames: sample the original action at 30 evenly spaced phases. This is
   not a doubling of 16 and does not automatically mean 30 frames per second.
5. Expand headings and characters only after the small study passes. Twenty-four
   evenly spaced headings give 15-degree spacing around the full 360 degrees.

For a cycle of duration T, frame i among N samples is at phase i/N and time iT/N.
Do not duplicate the endpoint. Doubling samples while keeping T fixed increases
temporal density, not walking speed. Confirm how rig-forward azimuth maps to the
atlas camera before assigning production heading labels.

## Scaling and budget

```
sprites = Ncharacters * Nangles * Nframes
pixels = sprites * width * height
decoded RGBA8 bytes = pixels * 4
```

Each count scales linearly when varied alone. Doubling both angle count and
frame count makes four times as many sprites. Doubling width and height makes
four times as many pixels. Those coupled increases are quadratic; increasing
only the frame count is not. Increasing all four dimensions multiplies costs.

At 256x256, one character and 24 angles require 24, 48, 96, and 180 MiB of tightly
packed decoded RGBA8 for 4, 8, 16, and 30 frames respectively. Three characters
at 30 frames require 540 MiB. A single-angle four/eight comparison is just 1/2 MiB.
These estimates assume all sprites resident, not the runtime's loading strategy.
Atlas gutters, duplicate decode/staging buffers, other textures, and packing
waste add overhead. A full mip chain is approximately another one third.
PNG/WebP transfer size cannot be inferred from pixel count alone.

The planner's resolution is a **rig-output and final packing budget**, not a
promise about generated image dimensions. The available built-in image tool
exposes a prompt and references, not explicit resolution/quality controls. Inspect
its actual output; separately review any offline cropping/resampling/alpha work.
No Ollama provider, local model, or other installation is assumed available.

## Run the planner

From the source checkout, with an existing canonical external parent directory:

```sh
node scripts/plan-sprite-study.cjs \
  --characters pinpin --angles 1 --frames 4 --cycle-seconds 1 \
  --resolution 256x256 \
  --out-dir /Volumes/TB4/mac-mini-storage/shared/pinpin-sprite-plan-four

node scripts/plan-sprite-study.cjs \
  --characters pinpin --angles 1 --frames 8 --cycle-seconds 1 \
  --resolution 256x256 \
  --out-dir /Volumes/TB4/mac-mini-storage/shared/pinpin-sprite-plan-eight
```

Both commands make plans only and explicitly mark missing inputs. Use a new
output directory for each run. To bind actual files, repeat
`--reference pinpin=/absolute/approved-book-reference.png` and
`--guide pinpin=/absolute/matching-rig-guide.png` as needed. These are placeholders,
not claims that the files exist. Selected character IDs must match each binding.
Read-only input symlinks are resolved to their actual files; output symlink aliases
and destinations inside this checkout are rejected. Existing outputs are never
overwritten. Small plan files are fine locally; run rendering and heavy image
work on the mini/SSD. No network or image-model calls occur in this CLI.

`plan.json` records roles, byte identities, phase samples, estimates, and gates.
`prompt.txt` is ready to adapt for an image tool once actual references are
attached. Replace its character, heading, frame, and phase placeholders, and
identify the matching guide cell when appropriate. Do not submit missing roles.

## Prompt usable now

> Create one full-body sprite of the selected book character. Use the attached
> approved book reference only for identity, proportions, clothing, palette, and
> illustration style. Use the attached matching rig pose only for camera, heading,
> joint placement, limb overlap, foot contact, framing, and ground anchor. Do not
> copy the rig's placeholder materials. If rig proportions conflict with the book
> identity, stop for review rather than silently redesigning the character. Keep
> fixed scale and anchor, a complete silhouette, clear margins, no added limbs,
> labels, or scenery. Request transparency only where supported. This is one
> phase of the same timed cycle, not an edit of the preceding generated frame.
> Dimensions describe the eventual rig/packing budget, not guaranteed model output.

Attach actual files and specify the selected heading/phase before submitting.
This provider-neutral prompt requires no assumption about Ollama or paid APIs.

## Optional interpolation and final baking

[FILM](https://github.com/google-research/frame-interpolation) and
[RIFE](https://github.com/hzwer/ECCV2022-RIFE) are primary references for a future
offline comparison, not implemented dependencies. No model was installed here.
Our evaluation concern: interpolation, including optical-flow approaches, can
fail at occlusion, newly revealed regions, crossing legs, contacts, and alpha
edges. It must be tested against rig-sampled poses, including the loop seam.
Neither interpolated motion nor high-resolution keyframes magically restores
unobserved detail or guarantees correct anatomy in between.

Bake approved final sprites offline with consistent alpha, crop, scale, and
anchors. The runtime should select/play those frames, not repair anatomy or hide
broken gait with deformation. Production packaging, storage preservation, and
runtime integration require their own review and are not implemented by this plan.
