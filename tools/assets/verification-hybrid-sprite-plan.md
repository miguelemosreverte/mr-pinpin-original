# Hybrid sprite planner verification

Status: COMPLETE for documentation and planning CLI only, 2026-09-22.

## Delivered

- `docs/storyboard/production/hybrid-sprite-workflow.md`: proposal versus
  recommendation versus implementation; appearance/motion input roles; staged
  4/8/16/30 sampling; fixed cycle duration; 24 headings at 15 degrees; linear and
  coupled scaling; memory caveats; provider-neutral prompt; offline baking gates.
- `scripts/plan-sprite-study.cjs`: dependency-free, no network or model calls.
  Writes only `plan.json` and `prompt.txt` to an exclusive new external directory.
  Supports characters, angles, staged frames, dimensions, cycle duration, and
  repeated character-bound appearance references and rig guides. Records actual
  input byte hashes without claiming image validation or capability discovery.
- `scripts/plan-sprite-study.test.cjs`: seven focused tests passed.

## Verification

`node --test scripts/plan-sprite-study.test.cjs` passed 7/7 tests. Coverage includes
count/dimension validation, precise RGBA accounting, linear versus multiplicative
scaling, same-duration four/eight samples, reference roles and hashes, canonical
input symlinks, output containment, dangling output links, no overwrite, invalid
flags, CLI help, and exactly two generated planning files.

Two actual CLI smoke runs completed under the mini's shared SSD:

- `/Volumes/TB4/mac-mini-storage/shared/pinpin-sprite-plan-four/`
- `/Volumes/TB4/mac-mini-storage/shared/pinpin-sprite-plan-eight/`

Both use one character, one angle, a one-second cycle, and a 256x256 rig/packing
budget. Four samples estimate 1 MiB; eight samples estimate 2 MiB of resident
RGBA8 without mipmaps or overhead. Both explicitly record missing appearance
and guide inputs, `status: plan-only`, and `imageCalls: 0`. They are not render
evidence. The smoke commands exited successfully; no background jobs remain.

`git diff --check` reported no whitespace errors in tracked changes. The new
planner's parsing and behavior were checked directly by the tests above.

## Limits and handoff

Resolution is a rig-output and packing budget, not an image generation promise.
No provider, Ollama installation, exact model resolution, or quality control is
assumed. Four appearance keys do not prove gait. Dense poses must come from the
same rig/action, not cumulative edits to prior generated frames.

The workflow links primary FILM and RIFE repositories only as optional future
comparisons. No interpolation code or weights were installed. Occlusions,
crossing limbs, loop seams, and missing detail still need explicit visual review.

Blender guides belong to the separate `scripts/sprite-pose-study/` lane; image
generation/review belongs to the operator. Packing, runtime integration, and
production approval are not implemented here. No runtime, binary, manifest,
storage object, or Git index/history changes were made. Concurrent unrelated
working-tree edits were preserved. No commit was made.
